import { Type } from 'class-transformer';
import { 
  IsObject, 
  IsOptional, 
  IsNumber, 
  IsBoolean,
  ValidateNested,
  Min,
  Max 
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
}

export class TransformImageDto {
  @IsObject()
  @ValidateNested()
  @Type(() => TransformationsDto)
  transformations: TransformationsDto;
}