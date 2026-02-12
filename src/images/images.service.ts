import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Image } from './entities/image.entity';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { TransformImageDto } from './dto/transform-image.dto';
import { RedisService } from 'src/redis/redis.service';
import { ClientProxy } from '@nestjs/microservices';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class ImagesService {
  constructor(
    @InjectModel('Image') private imageModel: Model<Image>,
    private awsS3Service: AwsS3Service,
    private redisService: RedisService,
    private usersService: UsersService,
    @Inject('RABBITMQ_SERVICE') private rabbitClient: ClientProxy,
  ) {}

  async uploadFile(userId, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      const ext = file.mimetype.split('/')[1];
      const fileId = `image-processing-service/${userId}/${Date.now()}.${ext}`;
      const url = await this.awsS3Service.uploadFile(fileId, file.buffer);

      const image = await this.imageModel.create({
        userId,
        filename: file.originalname,
        url,
        key: fileId,
        size: file.size,
        mimetype: file.mimetype,
      });

      await this.usersService.addImage(userId, image._id);

      const versionKey = `user:${userId}:version`;
      await this.redisService.incr(versionKey);
      return image;
    } catch (error) {
      throw new BadRequestException('failed to upload image');
    }
  }

  async getFile(userId, imageId: string) {
    if (!isValidObjectId(userId) || !isValidObjectId(imageId)) {
      throw new BadRequestException();
    }
    const cacheKey = `userId:${userId}:imageId:${imageId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      console.log('returning from redis');
      return JSON.parse(cached);
    }

    const image = await this.imageModel
      .findOne({
        _id: imageId,
        userId: userId,
      })
      .lean();
    if (!image) throw new NotFoundException('image not found');

    await this.redisService.set(cacheKey, JSON.stringify(image), 300);
    return image;
  }

  async getAll(userId, query: PaginationQueryDto) {
    let { page = 1, limit = 10 } = query;
    if (limit > 10) limit = 10;
    const skip = (page - 1) * limit;

    const versionKey = `user:${userId}:version`;
    let version = await this.redisService.get(versionKey);
    if (!version) {
      version = '1';
      await this.redisService.set(versionKey, version);
    }

    const cacheKey = `images:${userId}:v:${version}:page${query.page}:limit${query.limit}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      console.log('returning from redis');
      return JSON.parse(cached);
    }

    console.log('quering db');
    const images = await this.imageModel
      .find({ userId: userId })
      .skip(skip)
      .limit(limit);

    await this.redisService.set(cacheKey, JSON.stringify(images), 300);
    return images;
  }

  async getFileContent(filId) {
    return await this.awsS3Service.getFile(filId);
  }

  async transform(userId, imageId, transformImageDto: TransformImageDto) {
    this.rabbitClient.emit('transform_image', {
      userId,
      imageId,
      transformImageDto,
    });
    return 'transformation queued';
  }

  async deleteImage(userId, imageId) {
    const image = await this.imageModel.findOneAndDelete({
      _id: imageId,
      userId: userId,
    });
    if (!image) throw new BadRequestException();

    try {
      await this.awsS3Service.deleteFile(image.key);
      await this.redisService.delete(`userId:${userId}:imageId:${imageId}`);
      await this.redisService.incr(`user:${userId}:version`);
      return 'image deleted successfully';
    } catch (error) {
      throw new BadRequestException('failed to delete image');
    }
  }
}
