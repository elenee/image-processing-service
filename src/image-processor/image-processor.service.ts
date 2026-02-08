import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import sharp, { FormatEnum } from 'sharp';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { TransformImageDto } from 'src/images/dto/transform-image.dto';
import { Image } from 'src/images/entities/image.entity';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class ImageProcessorService {
  constructor(
    @InjectModel('Image') private imageModel: Model<Image>,
    private awsS3Service: AwsS3Service,
    private redisService: RedisService,
  ) {}

  async transform(data: {
    userId;
    imageId;
    transformImageDto: TransformImageDto;
  }) {
    const { userId, imageId, transformImageDto } = data;
    const cacheKey = `imageId:${imageId}:transformations:${JSON.stringify(transformImageDto.transformations)}`;
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
}
