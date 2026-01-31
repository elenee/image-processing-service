import { IsObject } from 'class-validator';

export class TransformImageDto {
  @IsObject()
  transformations: {
    resize?: { width: number; height: number };
    crop?: { width: number; height: number; x: number; y: number };
    rotate?: number;
    format?: string;
    filters?: { grayscale?: boolean; sepia?: boolean };
  };
}
