import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from 'src/decorators/user.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Patch()
  update(@User() userId: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(userId, updateUserDto);
  }

  @UseGuards(AuthGuard)
  @Delete()
  remove(@User() userId: string) {
    return this.usersService.remove(userId);
  }
}
