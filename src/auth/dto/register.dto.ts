import { IsNotEmpty, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @Length(6, 50)
  username: string;
  @IsNotEmpty()
  @IsString()
  @Length(6, 50)
  password: string;
}
