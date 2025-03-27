import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { ProjectEntity, AudioEntity, User } from 'src/utils/containers';
import { BullModule } from '@nestjs/bull';
import { BullQueues, ContainersEnum } from 'src/utils/enums';
import { createClient } from 'redis';

@Module({
  imports: [
    AzureCosmosDbModule.forFeature([
      {
        dto: ProjectEntity,
        collection: ContainersEnum.PROJECTS,
      },
      {
        dto: AudioEntity,
        collection: ContainersEnum.AUDIO,
      },
      {
        dto: User,
        collection: ContainersEnum.USER,
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
  providers: [
    ProjectService,
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
export class ProjectModule {}
