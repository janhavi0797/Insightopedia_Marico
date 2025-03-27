import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectEntity } from 'src/utils/containers/project.entity';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProjectDto, ProjectsDto } from './dtos';

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

  @Get('list')
  @ApiOperation({ summary: 'Get All Projects of user.' })
  async getAllProjects(@Query() projectsDto: ProjectsDto) {
    const { isAllFile, userId } = projectsDto;
    try {
      return await this.projectService.getAllProjects(+isAllFile, userId);
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw new BadRequestException(`${err.message}`);
      } else if (err instanceof NotFoundException) {
        throw new NotFoundException(`${err.message}`);
      }
      throw new InternalServerErrorException(`${err.message}`);
    }
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
