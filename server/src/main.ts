import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { BullQueues } from './utils/enums';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Insightopedia Marico')
    .setDescription('The Median API description')
    .setVersion('0.1')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableCors({
    origin: ['http://localhost:4200'], // Replace with your Angular app's URL
    //origin: ['https://maricointellivoice.atriina.com'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // If you are using cookies or authorization headers
  });

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  // Use ValidationPipe globally to automatically validate incoming requests
  app.useGlobalPipes(new ValidationPipe());

  const transcriptionQueue = app.get<Queue>(
    getQueueToken(BullQueues.TRANSCRIPTION),
  );
  const translationQueue = app.get<Queue>(
    getQueueToken(BullQueues.TRANSLATION),
  );
  const summaryQueue = app.get<Queue>(getQueueToken(BullQueues.SUMMARY));
  const embeddingQueue = app.get<Queue>(getQueueToken(BullQueues.EMBEDDING));
  const projectSummaryQueue = app.get<Queue>(
    getQueueToken(BullQueues.PROJECT_SUMMARY),
  );
  const uploadQueue = app.get<Queue>(getQueueToken(BullQueues.UPLOAD));

  createBullBoard({
    queues: [
      new BullAdapter(transcriptionQueue),
      new BullAdapter(translationQueue),
      new BullAdapter(summaryQueue),
      new BullAdapter(embeddingQueue),
      new BullAdapter(projectSummaryQueue),
      new BullAdapter(uploadQueue),
    ],
    serverAdapter,
  });

  // Mount the Bull-Board UI at '/admin/queues'
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use('/admin/queues', serverAdapter.getRouter());

  await app.listen(3001);
}
bootstrap();
