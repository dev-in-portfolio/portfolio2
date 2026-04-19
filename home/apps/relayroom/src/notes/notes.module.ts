import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { DbModule } from '../db/db.module';
import { AuthLiteModule } from '../authlite/authlite.module';

@Module({
  imports: [DbModule, AuthLiteModule],
  providers: [NotesService],
  controllers: [NotesController]
})
export class NotesModule {}
