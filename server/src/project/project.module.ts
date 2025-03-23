import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { ProjectEntity } from './entity';
import { AudioEntity } from './entity/audio.entity';
import { BullModule } from '@nestjs/bull';
import { BullQueues, ContainersEnum } from 'src/utils/enums';
import { AudioUtils } from 'src/utils';
import { ChatService } from 'src/chat/chat.service';

@Module({
  imports: [
    AzureCosmosDbModule.forFeature([{
      dto: ProjectEntity,
      collection: ContainersEnum.PROJECTS,
    },
    {
      dto: AudioEntity,
      collection: ContainersEnum.AUDIO,
    }
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
export class ProjectModule { }
