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
import { Audio } from './entity/audio.enitity';
import { v4 as uuidv4 } from 'uuid';
import { AudioGetAllDTO } from './dto/get-audio.dto';
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { ProjectEntity, User } from 'src/utils/containers';

// const unlinkAsync = promisify(fs.unlink);
ffmpeg.setFfmpegPath('C:/ffmpeg/ffmpeg.exe');
const execAsync = promisify(exec);

@Injectable()
export class AudioService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: any;

  constructor(
    @InjectModel(Audio) private readonly audioContainer: Container,
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

      const audioData: AudioGetAllDTO[] = await Promise.all(
        resources.map(async (item) => {
          const fileUrl = await this.generateBlobSasUrl(
            item.audioName.substring(item.audioName.lastIndexOf('/') + 1),
          );

          return {
            audioId: item.audioId,
            audioName: item.audioName,
            userId: item.userId,
            tags: item.tags || [],
            audioUrl: fileUrl, // Now it's a resolved string, not a Promise<string>
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
      console.error('Error fetching audio records:', error);

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

  async getAllProjects(isAllFile: number, userId: string) {
    const userQuerySpec = {
      query: `SELECT * FROM c WHERE c.userid = @userId`,
      parameters: [{ name: '@userId', value: userId }],
    };

    const { resources: userRecords } = await this.userContainer.items
      .query(userQuerySpec)
      .fetchAll();

    if (!userRecords || userRecords.length === 0) {
      throw new NotFoundException(`Invalid User.`);
    }

    const primaryUser = userRecords[0];

    // Build list of userIds to query projects
    let relevantUserIds = [userId]; // Always include self

    if (isAllFile === 1 && Array.isArray(primaryUser.mapUser)) {
      relevantUserIds = [
        ...new Set([...relevantUserIds, ...primaryUser.mapUser]),
      ];
    }

    //Prepare query specs with ORDER BY
    const usersQuerySpec = {
      query: `
        SELECT * FROM c 
        WHERE ARRAY_CONTAINS(@userIds, c.userid)
        ORDER BY c._ts DESC
      `,
      parameters: [{ name: '@userIds', value: relevantUserIds }],
    };

    const projectsQuerySpec = {
      query: `
        SELECT * FROM c 
        WHERE ARRAY_CONTAINS(@userIds, c.userId)
        ORDER BY c._ts DESC
      `,
      parameters: [{ name: '@userIds', value: relevantUserIds }],
    };

    //Fetch users and projects in parallel
    const [usersQueryResult, projectsQueryResult] = await Promise.all([
      this.userContainer.items.query(usersQuerySpec).fetchAll(),
      this.projectContainer.items.query(projectsQuerySpec).fetchAll(),
    ]);

    const { resources: relevantUsers } = usersQueryResult;
    const { resources: relevantProjects } = projectsQueryResult;

    //Create map of userId to userName for quick lookups
    const userIdToNameMap = new Map(
      relevantUsers.map((user) => [user.userid, user.userName]),
    );

    //adjust the response
    const projectSummaries = relevantProjects.map((project) => {
      const userName = userIdToNameMap.get(project.userId);
      if (!userName) {
        Logger.warn(`No matching user found for userId`);
        return null;
      }

      return {
        userId: project.userId,
        userName,
        projectName: project.projectName,
        projectId: project.projectId,
        status: project.status || 0,
      };
    });

    return {
      status: 200,
      count: projectSummaries.length,
      data: projectSummaries,
    };
  }
}
