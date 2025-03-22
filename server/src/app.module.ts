import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { AudioModule } from './audio/audio.module';
import { Container, CosmosClient } from '@azure/cosmos';

@Module({
  imports: [
    // Import ConfigModule to make ConfigService available
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally in the app
    }),

    BullModule.forRoot({
      connection: {
        host: process.env.QUEUE_HOST,
        port: +process.env.QUEUE_PORT,
      },
    }),

    AzureCosmosDbModule.forRoot({
      dbName: process.env.COSMOS_DBNAME,
      endpoint: process.env.COSMOS_DB_ENDPOINT,
      key: process.env.COSMOS_DB_KEY,
    }),

    AudioModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'AUDIO_CONTAINER',
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Container => {
        const client = new CosmosClient({
          endpoint: configService.get<string>('COSMOS_DB_ENDPOINT'),
          key: configService.get<string>('COSMOS_DB_KEY'),
        });
        return client
          .database(configService.get<string>('COSMOS_DBNAME'))
          .container('Audio');
      },
    },
  ],
})
export class AppModule {}
