import { Job } from 'bull';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { AudioUtils, EmailHelper } from 'src/utils';
import { BullQueues, QueueProcess } from 'src/utils/enums';
import { FileLogger } from 'src/utils/file-logger.utils';

@Processor(BullQueues.PROJECT_SUMMARY)
export class ProjectSummaryProcessor {
  private readonly logger = new Logger(ProjectSummaryProcessor.name);

  constructor(
    private readonly audioUtils: AudioUtils,
    private readonly emailHelper: EmailHelper,
    // @InjectQueue(BullQueues.SUMMARY) private readonly summaryQueue: Queue,
  ) {} // Service containing translation logic

  @Process({ name: QueueProcess.PROJECT_SUMMARY_AUDIO, concurrency: 5 }) // Handle jobs in the 'translate-audio' queue
  async handleProjectAudioSummaryJob(job: Job) {
    const { projectId } = job.data;
    job.log(
      `Project Summary job for  ProjectId ${projectId} started - Stage: Started`,
    );
    try {
      this.logger.log(`Project Summary job started for ${projectId}`);
      FileLogger.logSuccessToFile(projectId, 'Audio summary generated successfully.');
      await this.audioUtils.makeCombineSummaryOfAllAudios(projectId);
    } catch (error) {
      await this.emailHelper.sendProjectCreationFailureEmail(projectId);
      this.logger.error(`Project Summary job failed: ${error.message}`);
      FileLogger.logErrorToFile(projectId, error.stack || error.message);
      throw error;
    }
  }
}
