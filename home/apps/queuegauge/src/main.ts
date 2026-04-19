import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DbExceptionFilter } from './db-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn']
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.enableCors({ exposedHeaders: ['X-Request-Id'] });
  app.useGlobalFilters(new DbExceptionFilter());
  const port = Number(process.env.PORT || 3018);
  await app.listen(port);
  console.log(`QueueGauge API running on http://127.0.0.1:${port}`);
}

bootstrap();
