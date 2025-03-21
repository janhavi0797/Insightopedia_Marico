import { InjectModel, Repository } from '@nestjs/azure-database';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ProjectEntity } from './entity/project.entity';
import { Container } from '@azure/cosmos';
import { CreateProjectDto } from './dtos';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ProjectService {
    constructor(
        @InjectModel(ProjectEntity) private readonly projectContainer: Container
    ) { }

    async createProject(project: CreateProjectDto): Promise<{ status: string; message: string; data: ProjectEntity; }> {
        try {

            const checkCreatre = new ProjectEntity();
            checkCreatre.projectId = uuid();
            checkCreatre.projectName = project.projectName;
            checkCreatre.userId = project.userId;
            checkCreatre.audioIds = project?.audioIds?.map(audio => audio?.audioId);

            const result = await this.projectContainer.items.create(checkCreatre);
            console.log('result:', result.resource);

            if (!result?.resource) {
                return {
                    status: 'failed',
                    message: 'Failed to create project',
                    data: null
                }
            }
            return {
                status: 'success',
                message: 'Project created successfully',
                data: result?.resource
            }
        } catch (err) {
            console.log('err:', err);
            throw new InternalServerErrorException('Failed to create project');
        }
    }
}
