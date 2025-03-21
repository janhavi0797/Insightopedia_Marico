import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Insightopedia Marico')
    .setDescription('The Median API description')
    .setVersion('0.1')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

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
