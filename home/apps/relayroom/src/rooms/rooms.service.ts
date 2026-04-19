import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class RoomsService {
  constructor(private db: DbService) {}

  private async isMember(roomId: string, userId: string) {
    const result = await this.db.query(
      'select role from room_members where room_id = $1 and user_id = $2',
      [roomId, userId]
    );
    return result.rows[0] || null;
  }

  private async assertOwner(roomId: string, userId: string) {
    const membership = await this.isMember(roomId, userId);
    if (!membership) throw new NotFoundException('Room not found.');
    if (membership.role !== 'owner') throw new ForbiddenException('Owner access required.');
  }

  async createRoom(userId: string, name: string) {
    const inviteCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    const created = await this.db.query(
      `insert into rooms (owner_id, name, invite_code)
       values ($1, $2, $3)
       returning id, name, invite_code, created_at`,
      [userId, name, inviteCode]
    );
    await this.db.query(
      `insert into room_members (room_id, user_id, role)
       values ($1, $2, 'owner')`,
      [created.rows[0].id, userId]
    );
    return created.rows[0];
  }

  async listRooms(userId: string) {
    const result = await this.db.query(
      `select r.id, r.name, r.invite_code, r.created_at, m.role
       from rooms r
       join room_members m on m.room_id = r.id
       where m.user_id = $1
       order by r.created_at desc`,
      [userId]
    );
    return result.rows;
  }

  async getRoom(userId: string, roomId: string) {
    const membership = await this.isMember(roomId, userId);
    if (!membership) throw new NotFoundException('Room not found.');
    const result = await this.db.query(
      `select id, name, invite_code, created_at
       from rooms
       where id = $1`,
      [roomId]
    );
    return { ...result.rows[0], role: membership.role };
  }

  async deleteRoom(userId: string, roomId: string) {
    await this.assertOwner(roomId, userId);
    const result = await this.db.query('delete from rooms where id = $1', [roomId]);
    return { ok: (result.rowCount ?? 0) > 0 };
  }

  async joinRoom(userId: string, inviteCode: string) {
    const room = await this.db.query(
      'select id, name, invite_code from rooms where invite_code = $1',
      [inviteCode]
    );
    if (!room.rows.length) throw new NotFoundException('Invite not found.');
    await this.db.query(
      `insert into room_members (room_id, user_id, role)
       values ($1, $2, 'member')
       on conflict do nothing`,
      [room.rows[0].id, userId]
    );
    return room.rows[0];
  }

  async listMembers(userId: string, roomId: string) {
    const membership = await this.isMember(roomId, userId);
    if (!membership) throw new NotFoundException('Room not found.');
    const result = await this.db.query(
      `select user_id, role, created_at
       from room_members
       where room_id = $1
       order by created_at asc`,
      [roomId]
    );
    return result.rows;
  }

  async removeMember(userId: string, roomId: string, memberId: string) {
    await this.assertOwner(roomId, userId);
    const result = await this.db.query(
      'delete from room_members where room_id = $1 and user_id = $2',
      [roomId, memberId]
    );
    return { ok: (result.rowCount ?? 0) > 0 };
  }
}
