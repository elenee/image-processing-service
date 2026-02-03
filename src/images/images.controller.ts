import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  Get,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ImagesService } from './images.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from 'src/decorators/user.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { TransformImageDto } from './dto/transform-image.dto';
import { Throttle } from '@nestjs/throttler';

@UseGuards(AuthGuard)
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @User() userId,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType: /image\/(png|jpeg|jpg|gif|webp|bmp|tiff)/,
          }),
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024,
            message: 'File is too large. Max file size is 10MB',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.imagesService.uploadFile(userId, file);
  }

  @Post('getfile')
  getFileContent(@Body('fileId') fileId: string) {
    return this.imagesService.getFileContent(fileId);
  }

  @Get()
  getAll(@User() userId, @Query() query: PaginationQueryDto) {
    return this.imagesService.getAll(userId, query);
  }

  @Get(':id')
  getFile(@User() userId, @Param('id') id: string) {
    return this.imagesService.getFile(userId, id);
  }

  @Post(':id/transform')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  transform(
    @User() userId,
    @Param('id') id: string,
    @Body() transformImageDto: TransformImageDto,
  ) {
    return this.imagesService.transform(userId, id, transformImageDto);
  }
}
