import { InjectModel } from '@nestjs/azure-database';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProjectEntity, AudioEntity, User } from 'src/utils/containers';
import { Container } from '@azure/cosmos';
import { CreateProjectDto } from './dtos';
import { v4 as uuid } from 'uuid';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BullQueues, QueueProcess, ResponseStatus } from 'src/utils/enums';
import { ITranscriptionProcessor } from 'src/utils/interfaces';
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import { generateBlobSasUrl } from '../utils/blobUrl';
import {
  AudioDataDTO,
  GetProjectDetailsDto,
} from './dtos/get_project_details.dto';

@Injectable()
export class ProjectService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: any;
  private readonly config = new ConfigService();
  constructor(
    @InjectModel(ProjectEntity) private readonly projectContainer: Container,
    @InjectModel(AudioEntity) private readonly audioContainer: Container,
    @InjectQueue(BullQueues.TRANSCRIPTION)
    private readonly transcriptionQueue: Queue,
    @Inject('RedisService') private readonly redisService,
    @InjectModel(User) private readonly userContainer: Container,
  ) {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING'),
    );
    this.containerClient = this.blobServiceClient.getContainerClient(
      this.config.get<string>('AUDIO_UPLOAD_BLOB_CONTAINER'),
    );
  }

  async createProject(
    project: CreateProjectDto,
  ): Promise<{ status: string; message: string; data: ProjectEntity }> {
    try {
      const projectObj = new ProjectEntity();
      projectObj.projectId = uuid();
      projectObj.projectName = project.projectName;
      projectObj.userId = project.userId;
      projectObj.audioIds = project?.audioIds?.map((audio) => audio?.audioId);

      const checkExistingProject = await this.projectContainer.items
        .query({
          query:
            'SELECT * FROM c WHERE c.projectName = @projectName AND c.userId = @userId',
          parameters: [
            { name: '@projectName', value: project.projectName },
            { name: '@userId', value: project.userId },
          ],
        })
        .fetchAll();

      if (checkExistingProject?.resources?.length > 0) {
        return {
          status: ResponseStatus.FAILED,
          message: 'Project with same name already exists',
          data: null,
        };
      }

      const result = await this.projectContainer.items.create(projectObj);

      if (!result?.resource) {
        return {
          status: 'failed',
          message: 'Failed to create project',
          data: null,
        };
      }

      if (project?.audioIds?.length > 0) {
        const audioPromises = project.audioIds.map(async (audio, index) => {
          const audioEntity = new AudioEntity();
          audioEntity.audioId = audio.audioId;
          const audioResult = await this.audioContainer.items
            .query({
              query: 'SELECT * FROM c WHERE c.audioId = @audioId',
              parameters: [{ name: '@audioId', value: audio.audioId }],
            })
            .fetchAll();

          const sasToken = await this.generateBlobSasUrl(
            audioResult?.resources[0]?.audioName,
          );

          console.log('sasToken:', sasToken);

          const audioData: Partial<ITranscriptionProcessor> = {
            audioId: audioResult.resources[0]?.audioId,
            primaryLang: audioResult.resources[0]?.primaryLang,
            secondaryLang: audioResult.resources[0]?.secondaryLang,
            noOfSpek: audioResult.resources[0]?.noOfSpek,
            fileName: audioResult?.resources[0]?.audioName,
            sasToken: sasToken,
          };
          this.transcriptionQueue.add(QueueProcess.TRANSCRIPTION_AUDIO, {
            ...audioData,
            projectId: projectObj.projectId,
          });

          Logger.log(
            `Transcription job for ${audio.audioId} enqueued successfully`,
          );

          console.log('audioEntity:', audioResult?.resources, audio.audioId);
          // If this is the last audio, mark it in Redis
          if (index === project.audioIds.length - 1) {
            await this.redisService.set(`lastAudio`, audio.audioId);
          }
        });
        Promise.all(audioPromises).then(() => {
          Logger.log(`Transcription jobs enqueued successfully`);
        });
      }

      Logger.log(`Project created successfully`);
      return {
        status: ResponseStatus.SUCCESS,
        message: 'Project created successfully',
        data: result?.resource,
      };
    } catch (err) {
      console.log('err:', err);
      throw new InternalServerErrorException('Failed to create project');
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
    Logger.log(`Generated SAS URL for blob: ${blobUrl}`);
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
        status: project.isSummaryAndSentimentDone ? 1 : 0,
      };
    });

    return {
      status: 200,
      count: projectSummaries.length,
      data: projectSummaries,
    };
  }

  // Get Project Details with projectId
  async getProject(projectId: string) {
    try {
      let sqlQuery = 'SELECT * FROM c';

      if (projectId) {
        sqlQuery = `SELECT * FROM c WHERE c.projectId = @projectId`;
      }

      const querySpec = {
        query: sqlQuery,
        parameters: projectId ? [{ name: '@projectId', value: projectId }] : [],
      };

      const { resources: projectResources } = await this.projectContainer.items
        .query(querySpec)
        .fetchAll();

      if (!projectResources || projectResources.length === 0) {
        return {
          statusCode: 404,
          message: 'No project records found',
          data: null,
        };
      }

      const audioQuerySpec = { query: 'SELECT * FROM c' };
      const { resources: audioResources } = await this.audioContainer.items
        .query(audioQuerySpec)
        .fetchAll();

      const audioData: AudioDataDTO[] = await Promise.all(
        audioResources.map(async (item) => {
          const fileUrl = await generateBlobSasUrl(item.audioName, this.config);
          return {
            audioId: item.audioId,
            audioName: item.audioName,
            userId: item.userId,
            tags: item.tags || [],
            audioUrl: fileUrl,
            audiodata: item.audiodata,
            summary: item.summary,
            sentiment_analysis: item.sentiment_analysis,
            combinedTranslation: item.combinedTranslation,
            vectorId: item.vectorId,
          };
        }),
      );

      const projectDetails: GetProjectDetailsDto[] = projectResources.map(
        (project) => ({
          projectId: project.projectId,
          projectName: project.projectName,
          userId: project.userId,
          summary: project.summary,
          sentiment_analysis: project.sentiment_analysis,
          vectorId: project.vectorId,
          AudioData: project.audioIds
            ? audioData.filter((audio) =>
                project.audioIds.includes(audio.audioId),
              )
            : [],
        }),
      );

      return {
        statusCode: 200,
        message: 'Project details fetched successfully',
        // data: projectDetails.length ? projectDetails[0] : null,
        data: { projectDetails },
      };
    } catch (error) {
      console.error('Error fetching project details:', error);

      return {
        statusCode: 500,
        message: 'Failed to fetch project details',
        data: null,
        error: error.message,
      };
    }
  }
}
