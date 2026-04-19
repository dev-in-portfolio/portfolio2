import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class NotesService {
  constructor(private db: DbService) {}

  private async getMembership(roomId: string, userId: string) {
    const result = await this.db.query(
      'select role from room_members where room_id = $1 and user_id = $2',
      [roomId, userId]
    );
    return result.rows[0] || null;
  }

  async createNote(userId: string, roomId: string, title: string, body: string) {
    const membership = await this.getMembership(roomId, userId);
    if (!membership) throw new NotFoundException('Room not found.');
    const created = await this.db.query(
      `insert into room_notes (room_id, user_id, title, body)
       values ($1, $2, $3, $4)
       returning id, room_id, user_id, title, body, created_at`,
      [roomId, userId, title, body]
    );
    return created.rows[0];
  }

  async listNotes(userId: string, roomId: string, limit: number, cursor?: string) {
    const membership = await this.getMembership(roomId, userId);
    if (!membership) throw new NotFoundException('Room not found.');

    const params: any[] = [roomId];
    let clause = 'where room_id = $1';
    if (cursor) {
      const [createdAt, id] = cursor.split('|');
      if (createdAt && id) {
        params.push(createdAt, id);
        clause += ` and (created_at, id) < ($${params.length - 1}, $${params.length})`;
      }
    }
    params.push(limit + 1);
    const result = await this.db.query(
      `select id, room_id, user_id, title, body, created_at
       from room_notes
       ${clause}
       order by created_at desc, id desc
       limit $${params.length}`,
      params
    );
    const rows = result.rows.slice(0, limit);
    const nextCursor =
      result.rows.length > limit && rows.length
        ? `${rows[rows.length - 1].created_at.toISOString()}|${rows[rows.length - 1].id}`
        : null;
    return { notes: rows, nextCursor };
  }

  async deleteNote(userId: string, noteId: string) {
    const note = await this.db.query(
      `select id, room_id, user_id from room_notes where id = $1`,
      [noteId]
    );
    if (!note.rows.length) throw new NotFoundException('Note not found.');
    const membership = await this.getMembership(note.rows[0].room_id, userId);
    if (!membership) throw new NotFoundException('Room not found.');
    if (membership.role !== 'owner' && note.rows[0].user_id !== userId) {
      throw new ForbiddenException('Not allowed to delete note.');
    }
    const result = await this.db.query('delete from room_notes where id = $1', [noteId]);
    return { ok: (result.rowCount ?? 0) > 0 };
  }
}
