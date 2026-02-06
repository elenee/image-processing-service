import { BadRequestException, Body, Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

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

  async getFile(filId) {
    if (!filId) throw new BadRequestException('FileId is required');

    const config = {
      Key: filId,
      Bucket: this.bucketName,
    };

    const command = new GetObjectCommand(config);
    const fileStream = await this.s3.send(command);

    if (fileStream.Body instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (let chunk of fileStream.Body) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);
      const base64 = fileBuffer.toString('base64');
      const file = `data:${fileStream.ContentType};base64,${base64}`;
      return file;
    }
  }

  async getFileBuffer(fileId) {
    if (!fileId) throw new BadRequestException('FileId is required');

    const config = {
      Key: fileId,
      Bucket: this.bucketName,
    };

    const command = new GetObjectCommand(config);
    const res = await this.s3.send(command);

    const chunks: Buffer[] = [];
    for await (let chunk of res.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    return buffer;
  }

  async deleteFile(fileId) {
    if (!fileId) throw new BadRequestException('FileId is required');
    const config = {
      Key: fileId,
      Bucket: this.bucketName,
    };

    const command = new DeleteObjectCommand(config);
    await this.s3.send(command);
  }
}
