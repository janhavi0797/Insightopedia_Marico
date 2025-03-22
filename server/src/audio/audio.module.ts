import { Module } from '@nestjs/common';
import { AudioService } from './audio.service';
import { AudioController } from './audio.controller';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { ConfigModule } from '@nestjs/config';
import { Audio } from './entity/audio.enitity';

@Module({
  imports: [
    AzureCosmosDbModule.forFeature([
      {
        collection: 'Audio',
        dto: Audio,
      },
    ]),
    ConfigModule,
  ],
  controllers: [AudioController],
  providers: [AudioService],
})
export class AudioModule {}
