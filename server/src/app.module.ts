import { Global, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { AudioModule } from './audio/audio.module';
import { Container, CosmosClient } from '@azure/cosmos';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';
import { BullQueues, ContainersEnum } from './utils/enums';
import { AudioUtils } from './utils';
import { TranscriptionProcessor } from './processors/transcription.processor';
import { AudioEntity, ProjectEntity } from './utils/containers';
import { ChatModule } from './chat/chat.module';
import { TranslationProcessor } from './processors/translation.processor';
import { SummarySentimentsProcessor } from './processors/summarySentiments.processor';
import { EmbeddingProcessor } from './processors/embedding.processor';
import { createClient } from 'redis';
import { ProjectSummaryProcessor } from './processors/projectSummary.processor';

@Global()
@Module({
  imports: [
    // Import ConfigModule to make ConfigService available
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally in the app
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.QUEUE_HOST,
        port: +process.env.QUEUE_PORT,
      },
    }),

    AzureCosmosDbModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        endpoint: configService.get<string>('COSMOS_DB_ENDPOINT'),
        key: configService.get<string>('COSMOS_DB_KEY'),
        database: configService.get<string>('COSMOS_DBNAME'),
        dbName: configService.get<string>('COSMOS_DBNAME'),
      }),
      inject: [ConfigService],
    }),
    AzureCosmosDbModule.forFeature([
      {
        dto: ProjectEntity,
        collection: ContainersEnum.PROJECTS,
      },
      {
        dto: AudioEntity,
        collection: ContainersEnum.AUDIO,
      },
    ]),
    BullModule.registerQueue({
      name: BullQueues.TRANSCRIPTION,
    }),
    BullModule.registerQueue({
      name: BullQueues.TRANSLATION,
    }),
    BullModule.registerQueue({
      name: BullQueues.SUMMARY,
    }),
    BullModule.registerQueue({
      name: BullQueues.EMBEDDING,
    }),
    BullModule.registerQueue({
      name: BullQueues.PROJECT_SUMMARY,
    }),
    BullModule.registerQueue({
      name: BullQueues.UPLOAD,
    }),
    AudioModule,
    UserModule,
    ProjectModule,
    ChatModule,
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

    TranscriptionProcessor,
    TranslationProcessor,
    SummarySentimentsProcessor,
    EmbeddingProcessor,
    ProjectSummaryProcessor,
    AudioUtils,
    {
      provide: 'RedisService',
      useFactory: () => {
        const redisHost = process.env.QUEUE_HOST;
        const redisPort = process.env.QUEUE_PORT;
        if (!redisHost || !redisPort) {
          throw new Error('Missing Redis configuration');
        }
        const client = createClient({
          url: `redis://${redisHost}:${redisPort}`,
        });
        client.on('error', (err) => console.error('Redis Client Error', err));
        client.connect().catch(console.error);
        return {
          get: (key: string) => client.get(key),
          set: (key: string, value: string) => client.set(key, value),
        };
      },
    },
  ],
})
export class AppModule {}
