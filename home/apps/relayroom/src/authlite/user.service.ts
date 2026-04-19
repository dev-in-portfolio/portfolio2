import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class UserService {
  constructor(private db: DbService) {}

  async ensureUser(deviceKey: string) {
    const found = await this.db.query<{ id: string }>(
      'select id from users where device_key = $1',
      [deviceKey]
    );
    if (found.rows.length) return found.rows[0].id;
    const created = await this.db.query<{ id: string }>(
      'insert into users (device_key) values ($1) returning id',
      [deviceKey]
    );
    return created.rows[0].id;
  }
}
