import { Module } from '@nestjs/common';
import { AudioService } from './audio.service';
import { AudioController } from './audio.controller';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { ConfigModule } from '@nestjs/config';
import { AudioEntity, ProjectEntity, User } from 'src/utils/containers';
import { BullModule } from '@nestjs/bull';
import { BullQueues } from 'src/utils/enums';
import { UploadProcessor } from 'src/processors/upload.processor';

@Module({
  imports: [
    AzureCosmosDbModule.forFeature([
      {
        collection: 'User',
        dto: User,
      },
      {
        collection: 'Audio',
        dto: AudioEntity,
      },
      {
        collection: 'Projects',
        dto: ProjectEntity,
      },
    ]),
    ConfigModule,
    BullModule.registerQueue({
      name: BullQueues.UPLOAD,
    }),
  ],
  controllers: [AudioController],
  providers: [AudioService, UploadProcessor],
})
export class AudioModule {}
