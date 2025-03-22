import { InjectQueue, Process, Processor } from "@nestjs/bull";
import { Job, Queue } from 'bull';
import { AudioUtils } from "src/utils"
import { Logger } from "@nestjs/common";
import { QueueProcess } from "src/utils/enums";
import { ITransalationAudioProcessor } from "src/utils/interfaces";
// import { AudioService } from "../audio.service";


@Processor('transcription')
export class TranscriptionProcessor {
  private readonly logger = new Logger(TranscriptionProcessor.name);

  constructor(private readonly audioUtils: AudioUtils,
    @InjectQueue('translation') private readonly translationQueue: Queue,
    // private readonly audioService: AudioService

  ) { }
  @Process({ name: QueueProcess.TRANSCRIPTION_AUDIO, concurrency: 5 })
  async handleTranscriptionJob(job: Job) {
    const { audioId, sasToken, primaryLang, secondaryLang, noOfSpek, fileName } = job.data;
    await job.log(`Processing transcription job for audioId ${audioId}`);
    console.log(audioId, sasToken, primaryLang, secondaryLang, noOfSpek);
    try {
      await job.log(`Transcription job for audio array ${audioId} started`);
      const transcriptionResults = await this.audioUtils.transcribeAudio(audioId, sasToken, primaryLang, secondaryLang, noOfSpek);
      // console.log(transcriptionResults);
      await job.log(`Transcription job for audio ${audioId} completed`);

      const translationJob: ITransalationAudioProcessor = {
        transcriptionData: transcriptionResults.transcriptionResult,
        audioId: audioId,
        fileName: fileName
      };

      await this.translationQueue.add(QueueProcess.TRANSLATION_AUDIO, translationJob);

      // // Update status to success in the database
      // await this.audioService.updateStatus(TGId, {
      //   status: 1,
      //   //statusCode: 200,
      // });
    } catch (error) {
      this.logger.error(`Transcription job failed: ${error.message}`);
      // Update status to failed in the database
      // await this.audioService.updateStatus(TGId, {

      //   status: 2,
      //   //statusCode: 500,
      // });
      throw error;
    }
    await job.log(`Transcription job for all the audios are completed`);
  }
}