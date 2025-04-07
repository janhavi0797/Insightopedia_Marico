import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { BullQueues, QueueProcess } from 'src/utils/enums';
import * as fs from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { BlobServiceClient } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Container } from '@azure/cosmos';
import { AudioEntity } from 'src/utils/containers';
import { InjectModel } from '@nestjs/azure-database';
//import ffmpeg from 'fluent-ffmpeg';


const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
//ffmpeg.setFfmpegPath('C:/ffmpeg/ffmpeg.exe');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
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
        originalFileName:string;
      }[] = [];

      const uploadDir = join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uploadPromises = files.map(async (file) => {
        const timestamp = Date.now();
        const originalExt = file.originalname.split('.').pop()?.toLowerCase();
        const baseFileName = file.originalname.replace(/\.[^/.]+$/, '');
        const tempInputPath = join(uploadDir, `${timestamp}-${file.originalname}`);
        const processedOutputPath =
          originalExt === 'mp4'
            ? join(uploadDir, `converted-${timestamp}-${baseFileName}.mp3`)
            : join(uploadDir, `processed-${timestamp}-${file.originalname}`);
        const bufferData = Buffer.isBuffer(file.buffer)
          ? file.buffer
          : Buffer.from(file.buffer.data);
  
        fs.writeFileSync(tempInputPath, bufferData);
        const ffmpegPath = 'C:/ffmpeg/ffmpeg.exe'; // Adjust the path

        // Process the file with FFmpeg (noise cancellation and mono conversion)
        //const ffmpegCommand = `${ffmpegPath} -i ${tempFilePath} -af "highpass=f=300, lowpass=f=3000, afftdn=nf=-25" -ac 1 -ar 16000 ${processedFilePath}`;
        //const ffmpegCommand = `${ffmpegPath} -i "${tempFilePath}" -af "highpass=f=300, lowpass=f=3000, afftdn=nf=-25" -ac 1 -ar 16000 "${processedFilePath}"`;
        //await execAsync(`ffmpeg -i "${tempFilePath}" -af "highpass=f=300, lowpass=f=3000, afftdn=nf=-25" -ac 1 -ar 16000 "${processedFilePath}"`);
        // await execAsync(ffmpegCommand);

        // Read the processed file back into a buffer
        //const processedBuffer = fs.readFileSync(processedFilePath);

        // if (originalExt === 'mp4') {
        //   // Convert mp4 to mp3 with Azure-compatible audio profile
        //   const convertCommand = `${ffmpegPath} -i "${tempInputPath}" -vn -ar 16000 -ac 1 -b:a 192k -codec:a libmp3lame "${processedOutputPath}"`;
        //   await execAsync(convertCommand);
        // } else {
        //   // Apply noise filtering for other audio types
        //   const ffmpegCommand = `${ffmpegPath} -i "${tempInputPath}" -af "highpass=f=300, lowpass=f=3000, afftdn=nf=-25" -ac 1 -ar 16000 "${processedOutputPath}"`;
        //   await execAsync(ffmpegCommand);
        // }

        // MP4 to MP3 conversion
        if (originalExt === 'mp4') {
          await new Promise<void>((resolve, reject) => {
            ffmpeg(tempInputPath)
              .noVideo()
              .audioChannels(1)
              .audioFrequency(16000)
              .audioBitrate('192k')
              .audioCodec('libmp3lame')
              .output(processedOutputPath)
              .on('end', () => resolve())
              .on('error', err => reject(err))
              .run();
          });
        } else {
          // Noise filtering + conversion
          await new Promise<void>((resolve, reject) => {
            ffmpeg(tempInputPath)
              .audioFilters([
                'highpass=f=300',
                'lowpass=f=3000',
                'afftdn=nf=-25'
              ])
              .audioChannels(1)
              .audioFrequency(16000)
              .output(processedOutputPath)
              .on('end', () => resolve())
              .on('error', err => reject(err))
              .run();
          });
        }
        
       
        const processedBuffer = fs.readFileSync(processedOutputPath);
        
        // Upload processed file (use .mp3 name if converted from mp4)
        const finalBlobName =
          originalExt === 'mp4'
            ? `${baseFileName}.mp3`
            : file.originalname;
        const blockBlobClient = this.containerClient.getBlockBlobClient(
          finalBlobName,
        );

        const uploadBlobResponse = await blockBlobClient.uploadData(processedBuffer);
  
        Logger.log(
          `Blob ${finalBlobName} uploaded successfully: ${uploadBlobResponse.requestId}`,
        );
  
        sasUrls.push({
          fileName: finalBlobName,
          sasUri: blockBlobClient.url,
          originalFileName:file.originalname,
        });
  
        // Clean up temp files
        [tempInputPath, processedOutputPath].forEach((filePath) => {
          fs.unlink(filePath, (err) => {
            if (err) {
              Logger.error(`Failed to delete file: ${filePath}`, err);
            }
          });
        });
      });
  
      await Promise.all(uploadPromises);
  
      for (const items of sasUrls) {
        const audioName = items.originalFileName;
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
          audioItem.audioName=items.fileName;
          
          await this.audioContainer.items.upsert(audioItem);
          Logger.log(`${audioItem.audioName} status updated successfully.`);
        }
      }
    } catch (error) {
      console.error(`Failed to upload audio files: ${error.message}`);
    }
  }
}
