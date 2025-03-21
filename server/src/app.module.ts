import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AzureCosmosDbModule } from '@nestjs/azure-database';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
