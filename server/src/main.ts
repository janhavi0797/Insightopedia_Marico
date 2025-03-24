import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { ValidationPipe } from '@nestjs/common';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import bodyParser from 'body-parser';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Insightopedia Marico')
    .setDescription('The Median API description')
    .setVersion('0.1')
    .addServer('/Insightopedia/backend')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableCors({
    origin: ['http://localhost:4200'], // Replace with your Angular app's URL
   //origin: ['https://maricointellivoice.atriina.com'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,  // If you are using cookies or authorization headers
  });

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  // Use ValidationPipe globally to automatically validate incoming requests
  app.useGlobalPipes(new ValidationPipe());

  // Setup Bull-Board to monitor the queue
  createBullBoard({
    queues: [
      // new BullAdapter(audioQueue), // Add your queues here (e.g., audioQueue)
    ],
    serverAdapter,
  });

  // Mount the Bull-Board UI at '/admin/queues'
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use('/admin/queues', serverAdapter.getRouter());

  await app.listen(3000);
}
bootstrap();



