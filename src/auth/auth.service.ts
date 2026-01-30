import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.findByUsername(registerDto.username);
    if (user) throw new BadRequestException('User already exists');

    const hashedPass = await bcrypt.hash(registerDto.password, 10);

    const newUser = await this.usersService.create({
      ...registerDto,
      password: hashedPass,
    });

    if (!newUser) {
      throw new InternalServerErrorException('Failed to create user');
    }

    const payload = {
      userId: newUser._id,
    };

    const accessToken = await this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    const { password, ...userWithoutPassword } = newUser.toObject();

    return {
      user: userWithoutPassword,
      accessToken: accessToken,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByUsernameForAuth(
      loginDto.username,
    );
    if (!user) throw new BadRequestException('Invalid credentials');


    const isPassEqual = await bcrypt.compare(loginDto.password, user.password);
    if (!isPassEqual) throw new BadRequestException('Invalid credentials');

    const payload = {
      userId: user._id,
    };

    const accessToken = await this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    const { password, ...userWithoutPassword } = user.toObject();

    return { user: userWithoutPassword, accessToken };
  }

  async currentUser(userId: string) {
    if (!isValidObjectId(userId)) throw new BadRequestException('Invalid user ID');
    return await this.usersService.findOne(userId);
  }
}
