import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { ProjectEntity } from './entity';

@Module({
  imports: [
    AzureCosmosDbModule.forFeature([
      {
        dto: ProjectEntity,
        collection: 'Projects',
      },
    ]),
  ],

  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
