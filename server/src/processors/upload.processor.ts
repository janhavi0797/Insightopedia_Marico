import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { BullQueues, QueueProcess } from 'src/utils/enums';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { BlobServiceClient } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { Container } from '@azure/cosmos';
import { AudioEntity } from 'src/utils/containers';
import { InjectModel } from '@nestjs/azure-database';

ffmpeg.setFfmpegPath('C:/ffmpeg/ffmpeg.exe');
const execAsync = promisify(exec);

@Processor(BullQueues.UPLOAD)
export class UploadProcessor {
  private blobServiceClient: BlobServiceClient;
  private containerClient: any;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(AudioEntity) private readonly audioContainer: Container,
  ) {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING'),
    );
    this.containerClient = this.blobServiceClient.getContainerClient(
      this.config.get<string>('AUDIO_UPLOAD_BLOB_CONTAINER'),
    );
  }

  @Process({ name: QueueProcess.UPLOAD_AUDIO, concurrency: 5 })
  async UploadAudioFiles(job: Job) {
    const files = job.data.files;

    try {
      const sasUrls: {
        fileName: string;
        sasUri: string;
      }[] = [];

      const uploadDir = join(process.cwd(), 'uploads');

      // Check if the 'uploads' directory exists, if not, create it
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uploadPromises = files.map(async (file) => {
        const tempFilePath = join(
          'uploads',
          `${Date.now()}-${file.originalname}`,
        );
        const processedFilePath = join(
          'uploads',
          `processed-${Date.now()}-${file.originalname}`,
        );

        // Write the uploaded file buffer to disk temporarily
        const bufferData = Buffer.isBuffer(file.buffer)
          ? file.buffer
          : Buffer.from(file.buffer.data);

        fs.writeFileSync(tempFilePath, bufferData);
        const ffmpegPath = 'C:/ffmpeg/ffmpeg.exe'; // Adjust the path

        // Process the file with FFmpeg (noise cancellation and mono conversion)
        //const ffmpegCommand = `${ffmpegPath} -i ${tempFilePath} -af "highpass=f=300, lowpass=f=3000, afftdn=nf=-25" -ac 1 -ar 16000 ${processedFilePath}`;
        //const ffmpegCommand = `${ffmpegPath} -i "${tempFilePath}" -af "highpass=f=300, lowpass=f=3000, afftdn=nf=-25" -ac 1 -ar 16000 "${processedFilePath}"`;
        await execAsync(`ffmpeg -i "${tempFilePath}" -af "highpass=f=300, lowpass=f=3000, afftdn=nf=-25" -ac 1 -ar 16000 "${processedFilePath}"`);
        // await execAsync(ffmpegCommand);

        // Read the processed file back into a buffer
        const processedBuffer = fs.readFileSync(processedFilePath);

        const blockBlobClient = this.containerClient.getBlockBlobClient(
          file.originalname,
        );
        const uploadBlobResponse =
          await blockBlobClient.uploadData(processedBuffer);

        Logger.log(
          `Blob ${file.originalname} uploaded successfully: ${uploadBlobResponse.requestId}`,
        );

        const sasUri = blockBlobClient.url;
        const fileName = file.originalname;

        const filePaths = [tempFilePath, processedFilePath];

        filePaths.forEach((filePath) => {
          fs.unlink(filePath, (err) => {
            if (err) {
              Logger.error(`Failed to delete file: ${filePath}`, err);
              throw new InternalServerErrorException(
                `Failed to delete file: ${filePath}`,
              );
            }
          });
        });

        sasUrls.push({ fileName, sasUri });
      });

      await Promise.all(uploadPromises);

      for (const items of sasUrls) {
        //   // await this.audioContainer.items.create(items);
        const audioName = items.fileName;
        const updateQuerySpec = {
          query: `SELECT * FROM c WHERE c.audioName = @audioName`,
          parameters: [{ name: '@audioName', value: audioName }],
        };

        const { resources: audioRecords } = await this.audioContainer.items
          .query(updateQuerySpec)
          .fetchAll();

        if (audioRecords.length > 0) {
          const audioItem = audioRecords[0];
          audioItem.uploadStatus = 1;

          await this.audioContainer.items.upsert(audioItem);
          Logger.log(`${audioItem.audioName} status updated successfully.`);
        }
      }
    } catch (error) {
      console.error(`Failed to upload audio files: ${error.message}`);
    }
  }
}
