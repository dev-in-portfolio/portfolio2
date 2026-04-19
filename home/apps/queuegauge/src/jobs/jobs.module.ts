import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { DbModule } from '../db/db.module';
import { AuthLiteModule } from '../authlite/authlite.module';

@Module({
  imports: [DbModule, AuthLiteModule],
  providers: [JobsService],
  controllers: [JobsController]
})
export class JobsModule {}
