import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { ProjectEntity, AudioEntity } from 'src/utils/containers';
import { BullModule } from '@nestjs/bull';
import { BullQueues, ContainersEnum } from 'src/utils/enums';
import { AudioUtils } from 'src/utils';
import { ChatService } from 'src/chat/chat.service';

@Module({
  imports: [
    AzureCosmosDbModule.forFeature([
      {
        dto: ProjectEntity,
        collection: 'Projects',
      },
    ]),
    BullModule.registerQueue({
      name: BullQueues.TRANSLATION,
    }),
    BullModule.registerQueue({
      name: BullQueues.TRANSCRIPTION,
    }),
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
