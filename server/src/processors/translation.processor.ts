import { Job, Queue } from 'bull';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { AudioUtils } from 'src/utils';
import { BullQueues, QueueProcess } from 'src/utils/enums';
import {
  ISummaryProcessor,
  ITransalationAudioProcessor,
} from 'src/utils/interfaces';

@Processor(BullQueues.TRANSLATION)
export class TranslationProcessor {
  private readonly logger = new Logger(TranslationProcessor.name);

  constructor(
    private readonly audioUtils: AudioUtils,
    @InjectQueue(BullQueues.SUMMARY) private readonly summaryQueue: Queue,
  ) {} // Service containing translation logic

  @Process({ name: QueueProcess.TRANSLATION_AUDIO, concurrency: 5 }) // Handle jobs in the 'translate-audio' queue
  async handleTranslationJob(job: Job) {
    const {
      transcriptionData,
      audioId,
      fileName,
    }: ITransalationAudioProcessor = job.data;

    this.logger.log(`Translation job started for ${audioId}`);

    await job.log(`Processing translation job for ${audioId}`);
    try {
      const { updatedTextArray, combinedTranslation } =
        await this.audioUtils.translateText(transcriptionData);
      this.logger.log('Translation job completed:', audioId);
      await job.log('Translation job completed');

      const summaryJob: ISummaryProcessor = {
        updatedTextArray,
        combinedTranslation,
        audioId,
        fileName,
      };

      await this.summaryQueue.add(QueueProcess.SUMMARY_AUDIO, summaryJob);

      return { updatedTextArray, combinedTranslation, audioId, fileName };
    } catch (error) {
      this.logger.error(`Translation job failed: ${error.message}`);
      throw error;
    }
  }
}
