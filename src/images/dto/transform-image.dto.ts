import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
  IsString,
} from 'class-validator';

class ResizeDto {
  @IsNumber()
  @Min(1)
  width: number;

  @IsNumber()
  @Min(1)
  height: number;
}

class CropDto {
  @IsNumber()
  @Min(1)
  width: number;

  @IsNumber()
  @Min(1)
  height: number;

  @IsNumber()
  @Min(0)
  x: number;

  @IsNumber()
  @Min(0)
  y: number;
}

class FiltersDto {
  @IsOptional()
  @IsBoolean()
  grayscale?: boolean;

  @IsOptional()
  @IsBoolean()
  sepia?: boolean;
}

export class WatermarkDto {
  @IsOptional()
  @IsString()
  position?:
    | 'north'
    | 'south'
    | 'east'
    | 'west'
    | 'northeast'
    | 'southeast'
    | 'southwest'
    | 'northwest'
    | 'centre';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  opacity?: number;

  @IsOptional()
  url: string
}

class TransformationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ResizeDto)
  resize?: ResizeDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CropDto)
  crop?: CropDto;

  @IsOptional()
  @IsNumber()
  rotate?: number;

  @IsOptional()
  format?: string;

  @IsOptional()
  @IsBoolean()
  flip?: boolean;

  @IsOptional()
  @IsBoolean()
  mirror?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  compress?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => FiltersDto)
  filters?: FiltersDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WatermarkDto)
  watermark: WatermarkDto;
}

export class TransformImageDto {
  @IsObject()
  @ValidateNested()
  @Type(() => TransformationsDto)
  transformations: TransformationsDto;
}
