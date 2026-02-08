import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AwsS3Module } from './aws-s3/aws-s3.module';
import { ImagesModule } from './images/images.module';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RedisService } from './redis/redis.service';
import { RedisModule } from './redis/redis.module';
import { ImageProcessorService } from './image-processor/image-processor.service';
import { ImageProcessorController } from './image-processor/image-processor.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI!),
    MulterModule.register({
      storage: memoryStorage(),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    UsersModule,
    AuthModule,
    AwsS3Module,
    ImagesModule,
    RedisModule,
  ],
  controllers: [AppController, ImageProcessorController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    RedisService,
    ImageProcessorService,
  ],
})
export class AppModule {}
