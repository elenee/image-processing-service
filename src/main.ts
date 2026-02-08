import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { rabbitMQConfig } from './config/rabbitmq.options';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.connectMicroservice(rabbitMQConfig());
  await app.startAllMicroservices()
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
