import { Job } from 'bull';
import { Process, Processor } from '@nestjs/bull';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { AudioUtils, EmailHelper } from 'src/utils';
import { BullQueues, QueueProcess } from 'src/utils/enums';
import nodemailer from 'nodemailer';

@Processor(BullQueues.EMBEDDING)
export class EmbeddingProcessor {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(
    private readonly audioUtils: AudioUtils,
    private readonly emailHelper: EmailHelper,
  ) {} // Service containing translation logic

  @Process({ name: QueueProcess.EMBEDDING_AUDIO, concurrency: 5 }) // Handle jobs in the 'translate-audio' queue
  async handleTranslationJob(job: Job) {
    const { combinedTranslation, audioId, fileName, projectId } = job.data;
    await job.log(`Processing translation job for ${audioId}`);
    try {
      const vectorIds =
        await this.audioUtils.generateEmbeddings(combinedTranslation);
      await job.log('Translation job completed');
      await this.audioUtils.updateTranscriptionDocument(
        audioId,
        vectorIds,
        fileName,
      );
      await this.audioUtils.markStageCompleted(
        audioId,
        QueueProcess.EMBEDDING_AUDIO,
        projectId,
      );

      await job.log('Stage completed successfully');

      // Send email notification after successful embedding

      await this.emailHelper.sendProjectCreationEmail(projectId);
      await job.log('Email sent successfully');
    } catch (error) {
      await this.emailHelper.sendProjectCreationFailureEmail(projectId);
      await job.log('Project creation failed email sent successfully');

      this.logger.error(`Translation job failed: ${error.message}`);
      throw error;
    }
  }
}
