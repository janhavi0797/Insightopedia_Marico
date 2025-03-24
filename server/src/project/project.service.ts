import { InjectModel } from '@nestjs/azure-database';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ProjectEntity } from './entity/project.entity';
import { Container } from '@azure/cosmos';
import { CreateProjectDto } from './dtos';
import { v4 as uuid } from 'uuid';
import { generateBlobSasUrl } from '../utils/blobUrl';
import { ConfigService } from '@nestjs/config';
import {
  AudioDataDTO,
  GetProjectDetailsDto,
} from './dtos/get_project_details.dto';
import { Audio } from '../audio/entity/audio.enitity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(ProjectEntity) private readonly projectContainer: Container,
    @InjectModel(Audio) private readonly audioContainer: Container,
    private readonly configService: ConfigService,
  ) {}

  async createProject(
    project: CreateProjectDto,
  ): Promise<{ status: string; message: string; data: ProjectEntity }> {
    try {
      const checkCreatre = new ProjectEntity();
      checkCreatre.projectId = uuid();
      checkCreatre.projectName = project.projectName;
      checkCreatre.userId = project.userId;
      checkCreatre.audioIds = project?.audioIds?.map((audio) => audio?.audioId);

      const result = await this.projectContainer.items.create(checkCreatre);
      console.log('result:', result.resource);

      if (!result?.resource) {
        return {
          status: 'failed',
          message: 'Failed to create project',
          data: null,
        };
      }
      return {
        status: 'success',
        message: 'Project created successfully',
        data: result?.resource,
      };
    } catch (err) {
      console.log('err:', err);
      throw new InternalServerErrorException('Failed to create project');
    }
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
          const fileUrl = await generateBlobSasUrl(
            item.audioName,
            this.configService,
          );
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
