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
    const fileId = `image-processing-service/${userId}.${ext}`;
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

    const buffer = await this.awsS3Service.getFile(id);
    let sharpImage = sharp(buffer);
    const { transformations } = transformImageDto;

    if (transformations.resize) {
      sharpImage = sharpImage.resize(
        transformations.resize.width,

        transformations.resize.height,
      );
    }

    const ext = image.mimetype.split('/')[1];
    const newKey = `image-processing-service/${userId}.${ext}`;
    const url = await this.awsS3Service.uploadFile(id, buffer);

    const transformedImage = await this.imageModel.create({
      userId,
      url,
      key: newKey,
      size: image.size,
      mimetype: image.mimetype,
    });

    return transformedImage;
  }
}
