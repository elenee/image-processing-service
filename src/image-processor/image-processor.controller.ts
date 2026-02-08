import { Controller } from '@nestjs/common';
import { ImageProcessorService } from './image-processor.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

@Controller('image-processor')
export class ImageProcessorController {
  constructor(private imageProcessorService: ImageProcessorService) {}

  @EventPattern('transform_image')
  async transform(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      await this.imageProcessorService.transform(data);
    } catch (error) {
      console.error(error.message);
    }
  }
}
