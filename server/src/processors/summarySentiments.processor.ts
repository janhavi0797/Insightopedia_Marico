import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { AudioUtils } from 'src/utils/audio.utils';
import { Logger } from '@nestjs/common';
import { SENTIMENT_ANALYSIS, SUMMARY } from 'src/utils/constants';
import { BullQueues, QueueProcess } from 'src/utils/enums';
import { AudioEntity } from 'src/utils/containers';

@Processor(BullQueues.SUMMARY)
export class SummarySentimentsProcessor {
  private readonly logger = new Logger(SummarySentimentsProcessor.name);

  constructor(
    private readonly audioUtils: AudioUtils,
    @InjectQueue(BullQueues.EMBEDDING) private readonly embeddingQueue: Queue,
  ) {}
  @Process({ name: QueueProcess.SUMMARY_AUDIO, concurrency: 5 })
  async handleTranscriptionJob(job: Job) {
    const {
      updatedTextArray,
      combinedTranslation,
      audioId,
      fileName,
      projectId,
    } = job.data;

    this.logger.log('Summary job started');
    await job.log(`Processing transcription job for audio array`);
    try {
      await job.log(`Fetching Summary for ${audioId}`);
      const summaryResponse = await this.audioUtils.getSummaryAndSentiments(
        SUMMARY,
        combinedTranslation,
      );
      await job.log('Summary fetched');
      const sentimentResponse = await this.audioUtils.getSummaryAndSentiments(
        SENTIMENT_ANALYSIS,
        combinedTranslation,
      );
      await job.log('Sentiment Analysis fetched');

      const transcriptionDocument: Partial<AudioEntity> = {
        audioId,
        audioName: fileName,
        audiodata: updatedTextArray,
        summary: summaryResponse,
        sentiment_analysis: sentimentResponse,
        combinedTranslation: combinedTranslation,
        vectorIds: null,
      };
      // Save to Cosmos DB
      const val = await this.audioUtils.saveTranscriptionDocument(
        transcriptionDocument,
      );
      await job.log(JSON.stringify(val));
      await job.log(
        `Saved transcription document for ${audioId} without vectorId`,
      );

      await this.audioUtils.markStageCompleted(
        audioId,
        QueueProcess.SUMMARY_AUDIO,
        projectId,
      );

      const embeddingJob = {
        transcriptionDocument,
        combinedTranslation,
        audioId,
        fileName,
        projectId,
      };
      await this.embeddingQueue.add(QueueProcess.EMBEDDING_AUDIO, embeddingJob);
      return { transcriptionDocument };
    } catch (error) {
      this.logger.error(`Transcription job failed: ${error.message}`);
      throw error;
    }
  }
}
