import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { AudioModule } from './audio/audio.module';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';


const C = new ConfigService()
console.log(C.get<string>('COSMOS_DBNAME'))
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

    AzureCosmosDbModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        endpoint: configService.get<string>('COSMOS_DB_ENDPOINT'),
        key: configService.get<string>('COSMOS_DB_KEY'),
        database: configService.get<string>('COSMOS_DBNAME'),
        dbName: configService.get<string>('COSMOS_DBNAME')
      }),
      inject: [ConfigService],
    }),

    AudioModule,UserModule,
    ProjectModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
