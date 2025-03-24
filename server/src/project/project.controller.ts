import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectEntity } from './entity/project.entity';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProjectDto } from './dtos';

@Controller('project')
@ApiTags('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new project' })
  async createProject(
    @Body() project: CreateProjectDto,
  ): Promise<{ status: string; message: string; data: ProjectEntity }> {
    return this.projectService.createProject(project);
  }

  @Get('allProjectDetails')
  @ApiOperation({ summary: 'Get All Project audio and unique tag' })
  async getAudio(@Query('projectId') projectId: string) {
    if (!projectId) {
      throw new BadRequestException('Project ID is required');
    }
    return this.projectService.getProject(projectId);
  }
}
