import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { join } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { AudioGetAllDTO } from './dto/get-audio.dto';
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { AudioEntity, ProjectEntity, User } from 'src/utils/containers';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';

// const unlinkAsync = promisify(fs.unlink);
ffmpeg.setFfmpegPath('/home/high.pimatri/Insightopedia/server/ffmpeg/ffmpeg.exe');
const execAsync = promisify(exec);

@Injectable()
export class AudioService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: any;

  constructor(
    @InjectModel(AudioEntity) private readonly audioContainer: Container,
    @InjectModel(ProjectEntity) private readonly projectContainer: Container,
    @InjectModel(User) private readonly userContainer: Container,
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
    const audioNames = uploadAudioDto.map((audio) => audio.audioName);

    if (audioNames.length === 0) {
      throw new Error('No audio names provided.');
    }

    // Query to check if any of these audioNames already exist
    const audioQuerySpec = {
      query: `
        SELECT * FROM c 
        WHERE ARRAY_CONTAINS(@audioName, c.audioName)
      `,
      parameters: [{ name: '@audioName', value: audioNames }],
    };

    const { resources: existingAudios } = await this.audioContainer.items
      .query(audioQuerySpec)
      .fetchAll();

    if (existingAudios.length > 0) {
      const existingNames = existingAudios
        .map((audio) => audio.audioName)
        .join(', ');
      throw new BadRequestException(
        `Audio name already exist: ${existingNames}`,
      );
    }

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
        Logger.error(
          `No matching file found for audioName: ${audioObj.audioName}`,
        );
        throw new BadRequestException(
          `No matching file found for audioName: ${audioObj.audioName}`,
        );
      }

      return {
        audioId: uuidv4(),
        audioUrl: matchingFile.sasUri,
        audioName: audioObj.audioName,
        audioDate: audioObj.audioDate,
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
      return {
        statusCode: 200,
        message: 'File Uploaded successfully.',
      };
    } catch (err) {
      Logger.error(`${err.message}`);
      throw new InternalServerErrorException(`${err.message}`);
    }
  }

  async uploadAudioFiles(
    files: Express.Multer.File[],
  ): Promise<{ fileName: string; sasUri: string }[]> {
    try {
      const sasUrls: { fileName: string; sasUri: string }[] = [];

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
        fs.writeFileSync(tempFilePath, file.buffer);
        const ffmpegPath ='/home/high.pimatri/Insightopedia/server/ffmpeg/ffmpeg.exe'; // Adjust the path

        console.log(ffmpegPath);
        console.log(tempFilePath);

        // Process the file with FFmpeg (noise cancellation and mono conversion)
        //const ffmpegCommand = `${ffmpegPath} -i ${tempFilePath} -af "highpass=f=300, lowpass=f=3000, afftdn=nf=-25" -ac 1 -ar 16000 ${processedFilePath}`;
        // const ffmpegCommand = `${ffmpegPath} -i "${tempFilePath}" -af "highpass=f=300, lowpass=f=3000, afftdn=nf=-25" -ac 1 -ar 16000 "${processedFilePath}"`;


        await execAsync(`ffmpeg -i "${tempFilePath}" -af "highpass=f=300, lowpass=f=3000, afftdn=nf=-25" -ac 1 -ar 16000 "${processedFilePath}"`);

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

      const { resources } = await this.audioContainer.items
        .query(querySpec)
        .fetchAll();

      if (!resources || resources.length === 0) {
        return {
          statusCode: 404,
          message: 'No audio records found',
          data: { audioData: [], allUniqueTags: [] },
        };
      }

      let projectQuery = `SELECT * FROM c`;

      if (userId) {
        projectQuery = `SELECT * FROM c WHERE c.userId = @userId`;
      }

      const projectQuerySpec = {
        query: projectQuery,
        parameters: userId ? [{ name: '@userId', value: userId }] : [],
      };

      const { resources: projects } = await this.projectContainer.items
        .query(projectQuerySpec)
        .fetchAll();

      let associatedProjects = [];

      if (projects.length > 0) {
        associatedProjects = projects.map((project) => {
          return {
            projectId: project.projectId,
            projectName: project.projectName,
            audioIds: project.audioIds,
          };
        });
      }

      const audioData: AudioGetAllDTO[] = await Promise.all(
        resources.map(async (item) => {
          const fileUrl = await this.generateBlobSasUrl(
            item.audioName.substring(item.audioName.lastIndexOf('/') + 1),
          );

          //project Id and name
          const projectdata = associatedProjects
            .filter((project) => project.audioIds.includes(item.audioId))
            .map((project) => {
              return {
                projectId: project.projectId,
                projectName: project.projectName,
              };
            });

          return {
            audioId: item.audioId,
            audioName: item.audioName,
            userId: item.userId,
            tags: item.tags || [],
            audioUrl: fileUrl, // Now it's a resolved string, not a Promise<string>
            projects: projectdata,
          };
        }),
      );

      const allUniqueTags = [
        ...new Set(audioData.flatMap((audio) => audio.tags)),
      ];

      return {
        statusCode: 200,
        message: 'Audio records fetched successfully',
        data: { audioData, allUniqueTags },
      };
    } catch (error) {
      Logger.error('Error fetching audio records:', error);

      return {
        statusCode: 500,
        message: 'Failed to fetch audio records',
        data: null,
        error: error.message,
      };
    }
  }

  generateBlobSasUrl(fileName: string): Promise<string> {
    // const account = this.config.get<string>('BLOB_CONTAINER_ACCOUNT');
    // const key = this.config.get<string>('BLOB_CONTAINER_ACCOUNT_KEY');

    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.config.get<string>('BLOB_CONTAINER_ACCOUNT'),
      this.config.get<string>('BLOB_CONTAINER_ACCOUNT_KEY'),
    );

    //this.logger.error(`Fetching SasUrl for: ${fileName}`);
    // Permissions for the SAS URL (read, write, etc.)
    const permissions = new BlobSASPermissions();
    permissions.read = true; // You can adjust permissions here

    // Set expiry time for SAS URL
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 10); // Expires in 10 hour

    // Generate SAS Token
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerClient.containerName,
        blobName: fileName,
        permissions: permissions,
        expiresOn: expiryDate,
      },
      sharedKeyCredential,
    ).toString();

    // Build the full URL with the SAS token
    const blobUrl = `${this.containerClient.url}/${fileName}?${sasToken}`;
    return Promise.resolve(blobUrl);
  }

  async generateSummeryPDF(
    res: Response,
    id: string,
    type: string,
    key: string,
  ) {
    const data = {
      id: id,
      type: type,
      key: key,
      summary: '',
      sentiment_analysis: '',
    };

    if (key == 'audio') {
      const userQuerySpec = {
        query: `SELECT c.${type} FROM c WHERE c.audioId = @audioId`,
        parameters: [{ name: '@audioId', value: id }],
      };

      const { resources: records } = await this.audioContainer.items
        .query(userQuerySpec)
        .fetchAll();

      if (!records.length) {
        throw new NotFoundException('No Audio Found.');
      }

      if (type === 'summary' || type === 'sentiment_analysis') {
        data[type] = records[0][type];
      }
    } else if (key == 'project') {
      const projectQuerySpec = {
        query: `SELECT c.${type} FROM c WHERE c.projectId = @projectId`,
        parameters: [{ name: '@projectId', value: id }],
      };

      const { resources: records } = await this.projectContainer.items
        .query(projectQuerySpec)
        .fetchAll();

      if (!records.length) {
        throw new NotFoundException('No Project Found.');
      }

      if (type === 'summary' || type === 'sentiment_analysis') {
        data[type] = records[0][type];
      }
    }

    return await this.generatePDF(res, data);
  }

  async generatePDF(res: Response, data: any) {
    const { id, key, summary, sentiment_analysis } = data;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set PDF Headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${key}_${id}.pdf`,
    );

    doc.pipe(res);

    // PDF Heading
    doc
      .fillColor('black') // Set text color to black
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(`Report for: ${key.charAt(0).toUpperCase() + key.slice(1)}`, {
        align: 'center',
      });
    doc.moveDown(2);

    let rows: any;

    if (key == 'audio') {
      // Audio Information Section
      doc
        .fillColor('#333333')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Audio Information : ', { underline: true });
      doc.moveDown(0.5);

      //query to get audio details
      const userQuerySpec = {
        query: `SELECT * FROM c WHERE c.audioId = @audioId`,
        parameters: [{ name: '@audioId', value: id }],
      };

      const { resources: records } = await this.audioContainer.items
        .query(userQuerySpec)
        .fetchAll();

      const record = records[0];

      rows = [
        [`Audio Name: `, `${record.audioName}`],
        [`No of Speakers: `, `${record.noOfSpek}`],
        [`Primary Language: `, `${record.primaryLang}`],
        [`Secondary Language: `, `${record.secondaryLang.join(', ')}`],
        [`Tags: `, `${record.tags.join(', ')}`],
      ];
    } else {
      // Project Information Section
      doc
        .fillColor('#333333')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Project Information : ', { underline: true });
      doc.moveDown(0.5);

      //query to get project details
      const projectQuerySpec = {
        query: `SELECT * FROM c WHERE c.projectId = @projectId`,
        parameters: [{ name: '@projectId', value: id }],
      };

      const { resources: records } = await this.projectContainer.items
        .query(projectQuerySpec)
        .fetchAll();

      const record = records[0];
      const mappedAudioIds = record.audioIds;

      // Query to get audionames
      const audioQuerySpec = {
        query: `
        SELECT c.audioName, c.tags FROM c 
        WHERE ARRAY_CONTAINS(@audioId, c.audioId)
      `,
        parameters: [{ name: '@audioId', value: mappedAudioIds }],
      };

      const { resources: projectAudios } = await this.audioContainer.items
        .query(audioQuerySpec)
        .fetchAll();

      const audioNames = projectAudios.map((audioObj) => audioObj.audioName);
      const allTags = projectAudios.flatMap((audioObj) => audioObj.tags);
      const uniqueTags = [...new Set(allTags)];

      rows = [
        [`Project: `, `${record.projectName}`],
        [`Audios: `, `${audioNames.join(', ')}`],
        [`Tags: `, `${uniqueTags.join(', ')}`],
      ];
    }

    rows.forEach(([title, content]) => {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#4B9CD3')
        .text(title, { continued: true });
      doc.font('Helvetica').fillColor('black').text(` ${content}`);
      doc.moveDown(0.3);
    });

    doc.moveDown(1);

    // Summary Section
    if (summary) {
      doc
        .fillColor('#4B9CD3')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Summary :', { underline: true });
      doc.moveDown(0.5);

      doc.fillColor('black').fontSize(12).font('Helvetica').text(summary, {
        align: 'justify',
        lineGap: 4,
      });
      doc.moveDown(1);
    }

    // Sentiment Analysis Section
    if (sentiment_analysis) {
      doc
        .fillColor('#4B9CD3')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Sentiment Analysis : ', { underline: true });
      doc.moveDown(0.5);

      // Split the sentiment analysis into lines
      const sentimentLines = sentiment_analysis.split('\n');

      sentimentLines.forEach((line) => {
        if (line.includes('### Overall Sentiment Analysis:')) {
          doc
            .fontSize(14)
            .fillColor('#34495E')
            .font('Helvetica-Bold')
            .text(line); // Dark Gray
        } else if (line.includes('### Comprehensive Sentiment Analysis:')) {
          doc
            .fontSize(14)
            .fillColor('#1F618D')
            .font('Helvetica-Bold')
            .text(line); // Navy Blue
        } else if (line.includes('#### Positive Sentiments')) {
          doc
            .fontSize(12)
            .fillColor('#27AE60')
            .font('Helvetica-Bold')
            .text(line); // Green
        } else if (line.includes('#### Neutral Sentiments')) {
          doc
            .fontSize(12)
            .fillColor('#F39C12')
            .font('Helvetica-Bold')
            .text(line); // Orange
        } else if (line.includes('#### Negative Sentiments')) {
          doc
            .fontSize(12)
            .fillColor('#E74C3C')
            .font('Helvetica-Bold')
            .text(line); // Red
        } else {
          doc.fontSize(11).fillColor('black').font('Helvetica').text(line); // Default text
        }
        doc.moveDown(0.3); // Add spacing between lines
      });

      doc.moveDown(1);
    }

    // Finalize the PDF
    doc.end();

    return {
      status: 200,
      message: 'PDF Generated successfully.',
    };
  }
}
