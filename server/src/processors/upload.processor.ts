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
import { BlobUploadCommonResponse } from '@azure/storage-blob';
import { PassThrough } from 'stream';


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
    const sasUrls: {
      fileName: string;
      sasUri: string;
      originalFileName: string;
      fileUploadStatus: number;
    }[] = [];
  
    for (const file of files) {
      const originalExt = file.originalname.split('.').pop()?.toLowerCase();
      const baseFileName = file.originalname.replace(/\.[^/.]+$/, '');
      const isConvertToMp3 = originalExt === 'mp4' || originalExt === 'm4a';
      //console.log("file buffer before hasAudio",file.originalname)
      const finalBlobName = isConvertToMp3 ? `${baseFileName}.mp3` : file.originalname;
  
      let uploadStatus = 2;
      let sasUri = '';
  
      try {
       // console.log("file buffer started",finalBlobName)
        const buffer = Buffer.isBuffer(file.buffer)
        ? file.buffer
        : Buffer.from(file.buffer.data);
//console.log("file buffer before hasAudio",finalBlobName)
      // ✅ Check for audio stream using ffprobe
      const hasAudio = await new Promise<boolean>((resolve, reject) => {
        const probeStream = new PassThrough();
        probeStream.end(buffer);
        ffmpeg(probeStream)
          .ffprobe((err, metadata) => {
            if (err) {
              reject(err);
            } else {
              const hasAudioStream = metadata.streams?.some(s => s.codec_type === 'audio');
              resolve(hasAudioStream);
            }
          });
      });

      if (!hasAudio) {
        uploadStatus = 2;
        sasUrls.push({
          fileName: finalBlobName,
          sasUri,
          originalFileName: file.originalname,
          fileUploadStatus: uploadStatus,
        });
        throw new Error('No audio stream found in file');
      }

        const inputStream = new PassThrough();
        inputStream.end(Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer.data));
  
        const ffmpegStream = new PassThrough();
  
        const ffmpegCommand = ffmpeg(inputStream)
          .inputFormat(originalExt!)
          .outputOptions([
            '-ac 1',
            '-ar 16000',
            ...(isConvertToMp3
              ? ['-b:a 192k', '-codec:a libmp3lame']
              : ['-af highpass=f=300,lowpass=f=3000,afftdn=nf=-25'])
          ])
          .format('mp3')
          .on('error', (err) => {
            //throw new Error(`FFmpeg processing error: ${err.message}`);
            Logger.error(`FFmpeg processing error for file ${file.originalname}: ${err.message}`);
          })
          .on('end', () => {
            Logger.log(`FFmpeg processing completed for ${file.originalname}`);
          });
  
        ffmpegCommand.pipe(ffmpegStream);
  
        // Upload directly from the FFmpeg output stream
        const blockBlobClient = this.containerClient.getBlockBlobClient(finalBlobName);
        const uploadResult: BlobUploadCommonResponse = await blockBlobClient.uploadStream(
          ffmpegStream,
          4 * 1024 * 1024, // buffer size (4MB)
          20,              // max concurrency
          { blobHTTPHeaders: { blobContentType: 'audio/mpeg' } }
        );
  
        Logger.log(`Blob ${finalBlobName} uploaded successfully: ${uploadResult.requestId}`);
        uploadStatus = 1;
        sasUri = blockBlobClient.url;
      } catch (err) {
        //console.log("UploadAudioFiles",err)
        Logger.error(`Failed to process file ${file.originalname}: ${err.message}`);
      }
  
      sasUrls.push({
        fileName: finalBlobName,
        sasUri,
        originalFileName: file.originalname,
        fileUploadStatus: uploadStatus,
      });
    }
  
    // Update Cosmos DB
    for (const item of sasUrls) {
      try {
        const audioName = item.originalFileName;
        const updateQuerySpec = {
          query: `SELECT * FROM c WHERE c.audioName = @audioName`,
          parameters: [{ name: '@audioName', value: audioName }],
        };
  
        const { resources: audioRecords } = await this.audioContainer.items
          .query(updateQuerySpec)
          .fetchAll();
  
        if (audioRecords.length > 0) {
          const audioItem = audioRecords[0];
          audioItem.uploadStatus = item.fileUploadStatus;
          audioItem.audioName = item.fileName;
  
          await this.audioContainer.items.upsert(audioItem);
          Logger.log(`${audioItem.audioName} status updated successfully.`);
        } else {
          Logger.warn(`No record found in DB for: ${item.originalFileName}`);
        }
      } catch (error) {
       // console.log("processAudioFiles-Upload",error);
        Logger.error(`Failed to update DB for ${item.originalFileName}: ${error.message}`);
      }
    }
  }
}
