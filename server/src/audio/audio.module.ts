import { Module } from '@nestjs/common';
import { AudioService } from './audio.service';
import { AudioController } from './audio.controller';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { ConfigModule } from '@nestjs/config';
import { Audio } from './entity/audio.enitity';
import { ProjectEntity, User } from 'src/utils/containers';

@Module({
  imports: [
    AzureCosmosDbModule.forFeature([
      {
        collection: 'User',
        dto: User,
      },
      {
        collection: 'Audio',
        dto: Audio,
      },
      {
        collection: 'Projects',
        dto: ProjectEntity,
      },
    ]),
    ConfigModule,
  ],
  controllers: [AudioController],
  providers: [AudioService],
})
export class AudioModule {}
