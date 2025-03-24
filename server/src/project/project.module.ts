import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { ProjectEntity } from './entity';
import { Audio } from '../audio/entity/audio.enitity';

@Module({
  imports: [
    AzureCosmosDbModule.forFeature([
      {
        dto: ProjectEntity,
        collection: 'Projects',
      },
      {
        collection: 'Audio',
        dto: Audio,
      },
    ]),
  ],

  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
