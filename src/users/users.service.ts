import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectModel('User') private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto) {
    const user = await this.userModel.create(createUserDto);
    return user;
  }

  findAll() {
    return this.userModel.find();
  }

  async findByUsernameForAuth(username: string) {
    const user = await this.userModel.findOne({ username: username });
    return user;
  }

  async findByUsername(username: string) {
    return await this.userModel
      .findOne({ username: username })
      .select('-password');
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid mongo id');
    const user = await this.userModel.findById(id).select('-password');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid mongo id');
    const user = await this.userModel.findByIdAndUpdate(id, updateUserDto, {
      new: true,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid mongo id');
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async addImage(userId, imageId){
    const updatedUser = await this.userModel.findByIdAndUpdate(userId, {$push: {images: imageId}}, {new: true});
    return updatedUser;
  }
}
