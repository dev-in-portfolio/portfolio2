import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { DeviceKeyGuard } from './device-key.guard';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  providers: [UserService, DeviceKeyGuard],
  exports: [UserService, DeviceKeyGuard]
})
export class AuthLiteModule {}
