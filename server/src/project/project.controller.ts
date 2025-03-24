import { Body, Controller, Post } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectEntity } from 'src/utils/containers/project.entity';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProjectDto } from './dtos';

@Controller('project')
@ApiTags('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) { }

  @Post('create')
  @ApiOperation({ summary: 'Create a new project' })
  async createProject(
    @Body() project: CreateProjectDto,
  ): Promise<{ status: string; message: string; data: ProjectEntity }> {
    return this.projectService.createProject(project);
  }
}
