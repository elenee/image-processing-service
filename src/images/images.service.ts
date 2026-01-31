import { BadRequestException, Injectable } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Image } from './entities/image.entity';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { randomUUID } from 'crypto';

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
    const fileId = `image-processing-service/${randomUUID()}.${ext}`;
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
}
