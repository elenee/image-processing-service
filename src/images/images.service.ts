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
import sharp from 'sharp';
import type { FormatEnum } from 'sharp';

@Injectable()
export class ImagesService {
  constructor(
    @InjectModel('Image') private imageModel: Model<Image>,
    private awsS3Service: AwsS3Service,
  ) {}

  async uploadFile(userId, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

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

    return image;
  }

  async getFile(userId, imageId: string) {
    if (!isValidObjectId(userId) || !isValidObjectId(imageId)) {
      throw new BadRequestException();
    }
    const image = await this.imageModel.findOne({
      _id: imageId,
      userId: userId,
    });
    if (!image) throw new NotFoundException('image not found');
    return image;
  }

  async getAll(userId, query: PaginationQueryDto) {
    let { page = 1, limit = 10 } = query;
    if (limit > 10) limit = 10;

    const skip = (page - 1) * limit;
    const images = await this.imageModel
      .find({ userId: userId })
      .skip(skip)
      .limit(limit);

    return images;
  }

  async getFileContent(filId) {
    return await this.awsS3Service.getFile(filId);
  }

  async transform(userId, id, transformImageDto: TransformImageDto) {
    const image = await this.imageModel.findOne({
      _id: id,
      userId: userId,
    });
    if (!image) throw new NotFoundException('image not found');

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
    if (transformations.compress) {
      sharpImage = sharpImage.jpeg({ quality: transformations.compress });

      sharpImage = sharpImage.png({
        quality: transformations.compress,
        compressionLevel: 9,
      });
    }

    const transformedBuffer = await sharpImage.toBuffer();
    const finalFormat = transformations.format || image.mimetype.split('/')[1];
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

    return transformedImage;
  }
}
