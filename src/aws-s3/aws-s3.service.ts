import { BadRequestException, Body, Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class AwsS3Service {
  private bucketName;
  private s3;

  constructor() {
    this.bucketName = process.env.AWS_BUCKET_NAME;
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: process.env.aws_access_key!,
        secretAccessKey: process.env.aws_secret_access_key!,
      },
      region: process.env.AWS_REGION,
    });
  }

  async uploadFile(filePath, buffer) {
    if (!filePath || !buffer) {
      throw new BadRequestException('FileId and buffer are required fields');
    }
    const config: any = {
      Body: buffer,
      Key: filePath,
      Bucket: this.bucketName,
    };

    const command = new PutObjectCommand(config);
    await this.s3.send(command);

    return `https://${this.bucketName}.s3.amazonaws.com/${filePath}`;
  }
}
