import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConfigModule } from '@nestjs/config';
import { AudioUtils } from 'src/utils/audio.utils';
import { Project } from 'src/audio/entity/project.entity';
import { AudioModule } from 'src/audio/audio.module';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { ContainersEnum } from 'src/utils/enums';
import { ProjectEntity } from 'src/utils/containers';
// import { TargetGroupEntity } from "src/audio/entity/target.entity";

@Module({
  imports: [
    AzureCosmosDbModule.forFeature([
      {
        collection: ContainersEnum.PROJECTS,
        dto: ProjectEntity,
      },
    ]),
    ConfigModule.forRoot(),
    AudioModule,
  ], // Add ConfigModule here
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
