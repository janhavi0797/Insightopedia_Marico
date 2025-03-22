import { Module } from '@nestjs/common';
import { AudioService } from './audio.service';
import { AudioController } from './audio.controller';
import { ConfigModule } from '@nestjs/config';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import {Audio} from './entity/audio.enitity'

@Module({
  imports:[AzureCosmosDbModule.forFeature([
    {
        collection:'Audio',
        dto: Audio
    }

]),ConfigModule.forRoot(),
],
  controllers: [AudioController],
  providers: [AudioService],
})
export class AudioModule {}
