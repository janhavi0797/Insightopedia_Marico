import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as ffmpeg from 'fluent-ffmpeg';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  AudioGetAllDTO,
  EditAudioTagDTO,
  GetAllFilesDTO,
  GetAllUniqueTagDTO,
} from './dto/get-audio.dto';
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { AudioEntity, ProjectEntity, User } from 'src/utils/containers';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';
import { BullQueues, QueueProcess } from 'src/utils/enums';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

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
    @InjectQueue(BullQueues.UPLOAD) private readonly uploadQueue: Queue,
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

    await this.uploadQueue.add(QueueProcess.UPLOAD_AUDIO, {
      files,
      uploadAudioDto,
    });

    const processedData = uploadAudioDto.map((audioObj) => ({
      audioId: uuidv4(),
      audioName: audioObj.audioName,
      audioDate: audioObj.audioDate,
      userId: audioObj.userId,
      uploadStatus: 0,
      noOfSpek: audioObj.noOfSpek,
      primaryLang: audioObj.primary_lang,
      secondaryLang: audioObj.secondary_lang,
      tags: audioObj.tags,
    }));

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

  // Get Audio ALL and User with unique tag
  async getAudio(userId?: string) {
    try {
      let sqlQuery = 'SELECT * FROM c ORDER BY c._ts DESC';

      if (userId) {
        sqlQuery = `SELECT * FROM c WHERE c.userId = @userId ORDER BY c._ts DESC`;
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

      const audioData: AudioGetAllDTO[] = await Promise.all(
        resources.map(async (item) => {
          const fileUrl = await this.generateBlobSasUrl(
            item.audioName.substring(item.audioName.lastIndexOf('/') + 1),
          );

          return {
            audioId: item.audioId,
            audioName: item.audioName,
            uploadStatus: item.uploadStatus,
            userId: item.userId,
            tags: item.tags || [],
            audioUrl: fileUrl,
          };
        }),
      );

      // const allUniqueTags = [
      //   ...new Set(audioData.flatMap((audio) => audio.tags)),
      // ];
      const allUniqueTags = [
        ...new Set(audioData.flatMap((audio) => audio.tags)),
      ].map((tag) => ({ name: tag }));

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
      const summaryNew = summary.replace(/\*\*(.*?)\*\*/g, '$1').trim();
      doc
        .fillColor('#4B9CD3')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Summary :', { underline: true });
      doc.moveDown(0.5);

      doc.fillColor('black').fontSize(12).font('Helvetica').text(summaryNew, {
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
        line = line
          .replace(/^#+\s*/, '')
          .replace(/^\*\*(.*?)\*\*$/, '$1')
          .trim();
        if (line.includes('Overall Sentiment Analysis:')) {
          doc
            .fontSize(14)
            .fillColor('#34495E')
            .font('Helvetica-Bold')
            .text(line); // Dark Gray
        } else if (line.includes('Comprehensive Sentiment Analysis:')) {
          doc
            .fontSize(14)
            .fillColor('#1F618D')
            .font('Helvetica-Bold')
            .text(line); // Navy Blue
        } else if (line.includes('Positive Sentiments')) {
          doc
            .fontSize(12)
            .fillColor('#27AE60')
            .font('Helvetica-Bold')
            .text(line); // Green
        } else if (line.includes('Neutral Sentiments')) {
          doc
            .fontSize(12)
            .fillColor('#F39C12')
            .font('Helvetica-Bold')
            .text(line); // Orange
        } else if (line.includes('Negative Sentiments')) {
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

  async editAudioTag(payload: EditAudioTagDTO) {
    try {
      // Step 1: Validate payload (Ensure required fields are provided)
      if (!payload || !payload.audioId) {
        return {
          statusCode: 404,
          message: 'Audio Data required for Tag update',
        };
      }
      if (payload.tags) {
        if (!Array.isArray(payload.tags)) {
          return {
            statusCode: 400,
            message: 'Tags should be an array',
          };
        }
        if (payload.tags.length == 0) {
          return {
            statusCode: 400,
            message: 'At least one tag is required',
          };
        } else if (payload.tags.length > 4) {
          return {
            statusCode: 400,
            message: 'Maximum 4 tags allowed',
          };
        } else if (payload.tags.includes('')) {
          return {
            statusCode: 400,
            message: 'Tags should not contain empty values',
          };
        }
      }
      // Step 2: Fetch the user based on email (assuming email is unique)
      const querySpecTag = {
        query: 'SELECT * FROM c WHERE c.audioId = @audioId',
        parameters: [{ name: '@audioId', value: payload.audioId }],
      };

      const { resources: existingAudio } = await this.audioContainer.items
        .query(querySpecTag)
        .fetchAll();
      // Step 3: Handle case when user is not found
      if (!existingAudio || existingAudio.length === 0) {
        return {
          statusCode: 404,
          message: 'No matching data available in database',
        };
      }

      const existingAudioData = existingAudio[0];
      existingAudioData.tags = payload.tags;

      // Step 5: Upsert the updated user back into CosmosDB
      await this.audioContainer.items.upsert(existingAudioData);

      return {
        statusCode: 200,
        message: 'Tags updated successfully',
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
      };
    }
  }

  async getAllFilesData(userId?: string) {
    try {
      let sqlQuery = 'SELECT * FROM c ORDER BY c._ts DESC';
      if (userId) {
        sqlQuery = `SELECT * FROM c WHERE c.userId = @userId ORDER BY c._ts DESC`;
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
        associatedProjects = projects.map((project) => ({
          projectId: project.projectId,
          projectName: project.projectName,
          audioIds: project.audioIds,
        }));
      }

      const uniqueAudioMap: Map<string, GetAllFilesDTO> = new Map();

      for (const item of resources) {
        const fileUrl = await this.generateBlobSasUrl(
          item.audioName.substring(item.audioName.lastIndexOf('/') + 1),
        );

        const projectNames = associatedProjects
          .filter((project) => project.audioIds.includes(item.audioId))
          .map((project) => project.projectName);

        if (projectNames.length === 0) {
          projectNames.push();
        }

        if (uniqueAudioMap.has(item.audioId)) {
          uniqueAudioMap
            .get(item.audioId)!
            .projectDetails.push(...projectNames);
        } else {
          // Otherwise, add a new entry
          uniqueAudioMap.set(item.audioId, {
            audioId: item.audioId,
            audioName: item.audioName,
            uploadStatus: item.uploadStatus,
            userId: item.userId,
            tags: item.tags || [],
            audioUrl: fileUrl,
            projectDetails: projectNames,
            _ts: item._ts,
          });
        }
      }

      const audioData = Array.from(uniqueAudioMap.values()).sort(
        (a, b) => b._ts - a._ts,
      );

      // const allUniqueTags = [...new Set(audioData.flatMap((audio) => audio.tags))];
      const allUniqueTags = [
        ...new Set(audioData.flatMap((audio) => audio.tags)),
      ].map((tag) => ({ name: tag }));

      return {
        statusCode: 200,
        message: 'Audio records fetched successfully',
        data: {
          audioData,
          allUniqueTags,
        },
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

  async getUniqueTags(userId?: string) {
    try {
      let sqlQuery = 'SELECT * FROM c ORDER BY c._ts DESC';

      if (userId) {
        sqlQuery = `SELECT * FROM c WHERE c.userId = @userId ORDER BY c._ts DESC`;
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
          data:[],
        };
      }

      const audioData: GetAllUniqueTagDTO[] = await Promise.all(
        resources.map(async (item) => {
          const fileUrl = await this.generateBlobSasUrl(
            item.audioName.substring(item.audioName.lastIndexOf('/') + 1),
          );

          return {
            tags: item.tags || [],
          };
        }),
      );

      // const allUniqueTags = [
      //   ...new Set(audioData.flatMap((audio) => audio.tags)),
      // ];
      const allUniqueTags = [
        ...new Set(audioData.flatMap((audio) => audio.tags)),
      ].map((tag) => ({ name: tag }));

      return {
        statusCode: 200,
        message: 'Audio Tags records fetched successfully',
        data: allUniqueTags,
      };
    } catch (error) {
      Logger.error('Error fetching audio tags records:', error);

      return {
        statusCode: 500,
        message: 'Failed to fetch audio tags records',
        data: [],
        error: error.message,
      };
    }
  }
}
