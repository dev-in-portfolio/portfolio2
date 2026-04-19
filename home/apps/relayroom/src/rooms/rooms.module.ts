import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { DbModule } from '../db/db.module';
import { AuthLiteModule } from '../authlite/authlite.module';

@Module({
  imports: [DbModule, AuthLiteModule],
  providers: [RoomsService],
  controllers: [RoomsController]
})
export class RoomsModule {}
