import { Module } from '@nestjs/common';
import { ImagesService } from './images.service';
import { ImagesController } from './images.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ImageSchema } from './entities/image.entity';
import { AwsS3Module } from 'src/aws-s3/aws-s3.module';
import { ClientsModule } from '@nestjs/microservices';
import { rabbitMQConfig } from 'src/config/rabbitmq.options';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Image', schema: ImageSchema }]),
    AwsS3Module,
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        ...rabbitMQConfig(),
      },
    ]),
    UsersModule
  ],
  controllers: [ImagesController],
  providers: [ImagesService],
  exports: [MongooseModule]
})
export class ImagesModule {}
