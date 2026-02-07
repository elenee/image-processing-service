import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Image } from './entities/image.entity';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { TransformImageDto } from './dto/transform-image.dto';
import sharp, { gravity } from 'sharp';
import type { FormatEnum } from 'sharp';
import { RedisService } from 'src/redis/redis.service';
import axios from 'axios';

@Injectable()
export class ImagesService {
  constructor(
    @InjectModel('Image') private imageModel: Model<Image>,
    private awsS3Service: AwsS3Service,
    private redisService: RedisService,
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
    const cacheKey = `imageId:${imageId}:transformations:${JSON.stringify(transformImageDto.transformations)}`;
    console.log(cacheKey);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      console.log('returning from redis');
      return JSON.parse(cached);
    }

    console.log('quering db');
    const image = await this.imageModel.findOne({
      _id: imageId,
      userId: userId,
    });
    if (!image) throw new NotFoundException('image not found');

    try {
      const buffer = await this.awsS3Service.getFileBuffer(image.key);

      let sharpImage = sharp(buffer);
      const { transformations } = transformImageDto;

      if (transformations.resize) {
        sharpImage = sharpImage.resize(
          transformations.resize.width,
          transformations.resize.height,
        );
      }
      if (transformations.rotate) {
        sharpImage = sharpImage.rotate(transformations.rotate);
      }
      if (transformations.crop) {
        sharpImage = sharpImage.extract({
          left: transformations.crop.x,
          top: transformations.crop.y,
          width: transformations.crop.width,
          height: transformations.crop.height,
        });
      }
      if (transformations.format) {
        const validFormats = ['jpeg', 'png', 'webp', 'gif', 'tiff', 'avif'];

        if (!validFormats.includes(transformations.format)) {
          throw new BadRequestException('Unsupported format.');
        }

        sharpImage = sharpImage.toFormat(
          transformations.format as keyof FormatEnum,
        );
      }
      if (transformations.filters?.grayscale) {
        sharpImage = sharpImage.greyscale();
      }
      if (transformations.filters?.sepia) {
        sharpImage = sharpImage.recomb([
          [0.3588, 0.7044, 0.1368],
          [0.299, 0.587, 0.114],
          [0.2392, 0.4696, 0.0912],
        ]);
      }

      if (transformations.flip) {
        sharpImage = sharpImage.flip();
      }
      if (transformations.mirror) {
        sharpImage = sharpImage.flop();
      }

      const format = image.mimetype.split('/')[1];

      if (transformations.compress) {
        const quality = transformations.compress;

        switch (format) {
          case 'jpeg':
          case 'jpg':
            sharpImage = sharpImage.jpeg({ quality });
            break;
          case 'png':
            sharpImage = sharpImage.png({ quality, compressionLevel: 9 });
            break;
          case 'webp':
            sharpImage = sharpImage.webp({ quality });
            break;
          case 'tiff':
            sharpImage = sharpImage.tiff({ quality });
          default:
            break;
        }
      }

      if (transformations.watermark) {
        const res = axios.get(transformations.watermark.url, {
          responseType: 'arraybuffer',
        });

        let watermarkBuffer = Buffer.from((await res).data);
        const contentType = (await res).headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
          throw new BadRequestException('url msut be an image');
        }
        const metadata = await sharpImage.metadata();
        const watermarkWidth = Math.floor(metadata.width * 0.2);

        watermarkBuffer = await sharp(watermarkBuffer)
          .resize({ width: watermarkWidth })
          .toBuffer();

        sharpImage = sharpImage.composite([
          {
            input: watermarkBuffer,
            gravity: transformations.watermark.position,
          },
        ]);
      }

      const transformedBuffer = await sharpImage.toBuffer();
      const finalFormat =
        transformations.format || image.mimetype.split('/')[1];
      const newKey = `image-processing-service/${userId}/${Date.now()}-transformed.${finalFormat}`;

      const url = await this.awsS3Service.uploadFile(newKey, transformedBuffer);
      const mimeType = transformations.format
        ? `image/${transformations.format}`
        : image.mimetype;

      const transformedImage = await this.imageModel.create({
        userId,
        filename: `${image.filename}-transformed`,
        url,
        key: newKey,
        size: transformedBuffer.length,
        mimetype: mimeType,
      });

      await this.redisService.set(
        cacheKey,
        JSON.stringify(transformedImage.toObject()),
        300,
      );
      return transformedImage;
    } catch (error) {
      console.error(error);
      throw new BadRequestException(
        `Image processing failed: ${error.message}`,
      );
    }
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
