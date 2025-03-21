import {
  Injectable,
  Get,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { join } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { BlobServiceClient } from '@azure/storage-blob';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { ConfigService } from '@nestjs/config';
import { Audio } from './entity/audio.enitity';
import { v4 as uuidv4 } from 'uuid';
import { AudioGetAllDTO } from './dto/get-audio.dto';

// const unlinkAsync = promisify(fs.unlink);
ffmpeg.setFfmpegPath('C:/ffmpeg/ffmpeg.exe');
const execAsync = promisify(exec);

@Injectable()
export class AudioService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: any;

  constructor(
    @InjectModel(Audio) private readonly audioContainer: Container,
    private readonly config: ConfigService,
  ) {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING'),
    );
    this.containerClient = this.blobServiceClient.getContainerClient(
      this.config.get<string>('AUDIO_UPLOAD_BLOB_CONTAINER'),
    );
  }

  async processAudioFiles(uploadAudioDto: any, files: Express.Multer.File[]) {
    try {
      const sasUrls = await this.uploadAudioFiles(files);

      const processedData = uploadAudioDto.map((audioObj) => {
        // Normalize audioName for matching (remove extension if present)
        const normalizedAudioName = audioObj.audioName.replace(/\.[^/.]+$/, '');

        // Find matching file by fileName (remove extension for comparison)
        const matchingFile = sasUrls.find((file) => {
          const normalizedFileName = file.fileName.replace(/\.[^/.]+$/, '');
          return normalizedFileName === normalizedAudioName;
        });

        if (!matchingFile) {
          Logger.warn(
            `No matching file found for audioName: ${audioObj.audioName}`,
          );
          return null;
        }

        return {
          audioId: uuidv4(),
          audioUrl: matchingFile.sasUri,
          audioName: audioObj.audioName,
          userId: audioObj.userId,
          noOfSpek: audioObj.noOfSpek,
          primaryLang: audioObj.primary_lang,
          secondaryLang: audioObj.secondary_lang,
          tags: audioObj.tags,
        };
      });

      try {
        for (const items of processedData) {
          await this.audioContainer.items.create(items);
        }
      } catch (error) {
        console.log(error);
      }
    } catch (err) {
      console.log(err);
    }
  }

  async uploadAudioFiles(
    files: Express.Multer.File[],
  ): Promise<{ fileName: string; sasUri: string }[]> {
    try {
      const sasUrls: { fileName: string; sasUri: string }[] = [];
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
        fs.writeFileSync(tempFilePath, file.buffer);
        const ffmpegPath = 'C:/ffmpeg/ffmpeg.exe'; // Adjust the path

        // Process the file with FFmpeg (noise cancellation and mono conversion)
        const ffmpegCommand = `${ffmpegPath} -i ${tempFilePath} -af "highpass=f=300, lowpass=f=3000, afftdn=nf=-25" -ac 1 -ar 16000 ${processedFilePath}`;
        await execAsync(ffmpegCommand);

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

        sasUrls.push({ fileName, sasUri });
      });

      await Promise.all(uploadPromises);
      return sasUrls;
    } catch (error) {
      Logger.error(`Failed to upload audio files: ${error.message}`);
      throw new InternalServerErrorException('Error uploading audio files');
    }
  }
  
// Get Audio ALL and User with unique tag    
async getAudio(userId?: string) {
    try {
        let sqlQuery = 'SELECT * FROM c';

        if (userId) {
            sqlQuery = `SELECT * FROM c WHERE c.userId = @userId`;
        }

        const querySpec = {
            query: sqlQuery,
            parameters: userId ? [{ name: '@userId', value: userId }] : [],
        };

        const { resources } = await this.audioContainer.items.query(querySpec).fetchAll();

        if (!resources || resources.length === 0) {
            return {
                status: 'success',
                message: 'No audio records found',
                data: { audioData: [], allUniqueTags: [] },
            };
        }

        const audioData: AudioGetAllDTO[] = resources.map((item) => ({
            audioId: item.audioId,
            audioName: item.audioName,
            userId: item.userId,
            tags: item.tags || [],
            audioUrl: item.audioUrl,
        }));

        const allUniqueTags = [...new Set(audioData.flatMap((audio) => audio.tags))];

        return {
            status: 'success',
            message: 'Audio records fetched successfully',
            data: { audioData, allUniqueTags },
        };
    } catch (error) {
        console.error('Error fetching audio records:', error);

        return {
            status: 'error',
            message: 'Failed to fetch audio records',
            data: null,
            error: error.message,
        };
    }
}
}
