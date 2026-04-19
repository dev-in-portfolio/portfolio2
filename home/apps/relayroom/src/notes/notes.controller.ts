import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { NotesService } from './notes.service';
import { DeviceKeyGuard } from '../authlite/device-key.guard';
import { CreateNoteDto } from './dto/create-note.dto';

@Controller('api')
@UseGuards(DeviceKeyGuard)
export class NotesController {
  constructor(private notes: NotesService) {}

  @Post('rooms/:id/notes')
  createNote(@Req() req: any, @Param('id') id: string, @Body() dto: CreateNoteDto) {
    return this.notes.createNote(req.userId, id, dto.title ?? '', dto.body);
  }

  @Get('rooms/:id/notes')
  listNotes(
    @Req() req: any,
    @Param('id') id: string,
    @Query('limit') limit = '50',
    @Query('cursor') cursor?: string
  ) {
    const parsed = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return this.notes.listNotes(req.userId, id, parsed, cursor);
  }

  @Delete('notes/:noteId')
  deleteNote(@Req() req: any, @Param('noteId') noteId: string) {
    return this.notes.deleteNote(req.userId, noteId);
  }
}
