import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { AudioUtils } from 'src/utils';
import { Logger } from '@nestjs/common';
import { BullQueues, QueueProcess } from 'src/utils/enums';
import {
  ITransalationAudioProcessor,
  ITranscriptionProcessor,
} from 'src/utils/interfaces';
// import { AudioService } from "../audio.service";
import { test } from 'src/test';

@Processor(BullQueues.TRANSCRIPTION)
export class TranscriptionProcessor {
  private readonly logger = new Logger(TranscriptionProcessor.name);

  constructor(
    private readonly audioUtils: AudioUtils,
    @InjectQueue(BullQueues.TRANSLATION)
    private readonly translationQueue: Queue,
    // private readonly audioService: AudioService
  ) {}
  @Process({ name: QueueProcess.TRANSCRIPTION_AUDIO, concurrency: 5 })
  async handleTranscriptionJob(job: Job) {
    const {
      audioId,
      sasToken,
      primaryLang,
      secondaryLang,
      noOfSpek,
      fileName,
    }: ITranscriptionProcessor = job.data;
    try {
      job.log(
        `Transcription job for audioId ${audioId} started - Stage: Started`,
      );
      const transcriptionResults = await this.audioUtils.transcribeAudio(
        audioId,
        sasToken,
        primaryLang,
        secondaryLang,
        noOfSpek,
      );
      job.log(
        `Transcription job for audioId ${audioId} completed - Stage: Transcription Completed`,
      );

      const translationJob: ITransalationAudioProcessor = {
        transcriptionData: transcriptionResults.transcriptionResult,
        audioId: audioId,
        fileName: fileName,
      };

      await this.translationQueue.add(
        QueueProcess.TRANSLATION_AUDIO,
        translationJob,
      );
      job.log(
        `Translation job for audioId ${audioId} added to queue - Stage: Translation Queued`,
      );
    } catch (error) {
      job.log(
        `Transcription job for audioId ${audioId} failed - Stage: Error: ${error.message}`,
      );
      throw error;
    }
    job.log(
      `Transcription job for audioId ${audioId} is completed - Stage: Completed`,
    );
  }
}
