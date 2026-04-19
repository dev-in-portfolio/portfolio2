import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { UserService } from './user.service';

@Injectable()
export class DeviceKeyGuard implements CanActivate {
  constructor(private users: UserService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const deviceKey = req.header('X-Device-Key');
    if (!deviceKey || deviceKey.length > 100) {
      throw new UnauthorizedException('X-Device-Key header required.');
    }
    req.userId = await this.users.ensureUser(deviceKey);
    return true;
  }
}
