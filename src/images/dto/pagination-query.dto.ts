import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page: number = 1;
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit: number = 10;
}
