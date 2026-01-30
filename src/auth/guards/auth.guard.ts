import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.getToken(request.headers);

    if (!token) throw new UnauthorizedException('unauth');

    try {
      const payload = this.jwtService.verify(token);
      request.userId = payload.userId;
    } catch (error) {
      throw new UnauthorizedException();
    }

    return true;
  }

  getToken(headers) {
    if (!headers.authorization) return null;
    const [type, token] = headers.authorization.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
