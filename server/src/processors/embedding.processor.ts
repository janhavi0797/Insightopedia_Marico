import { Job, Queue } from 'bull';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { AudioUtils } from 'src/utils';
import { BullQueues, QueueProcess } from 'src/utils/enums';

@Processor(BullQueues.EMBEDDING)
export class EmbeddingProcessor {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(private readonly audioUtils: AudioUtils) {} // Service containing translation logic

  @Process({ name: QueueProcess.EMBEDDING_AUDIO, concurrency: 5 }) // Handle jobs in the 'translate-audio' queue
  async handleTranslationJob(job: Job) {
    const {
      transcriptionDocument,
      combinedTranslation,
      audioId,
      fileName,
      projectId,
    } = job.data;
    await job.log(`Processing translation job for ${audioId}`);
    try {
      const vectorIds =
        await this.audioUtils.generateEmbeddings(combinedTranslation);
      console.log('vectorIds in emb', vectorIds);
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
    } catch (error) {
      this.logger.error(`Translation job failed: ${error.message}`);
      throw error;
    }
  }
}
