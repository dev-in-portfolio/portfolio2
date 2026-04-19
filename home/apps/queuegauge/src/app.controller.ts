import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { DbService } from './db/db.service';
import { DeviceKeyGuard } from './authlite/device-key.guard';

@Controller('api')
export class AppController {
  constructor(private db: DbService) {}

  @Get('health')
  async health() {
    const result = await this.db.query('select now() as now');
    return {
      ok: true,
      dbTime: result.rows[0].now,
      uptimeSeconds: Math.round(process.uptime()),
      version: 'v1'
    };
  }

  @UseGuards(DeviceKeyGuard)
  @Get('status')
  async status(@Req() req: any) {
    const counts = await this.db.query(
      `select status, count(*)::int as count
       from jobs
       where user_id = $1
       group by status`,
      [req.userId]
    );
    return { counts: counts.rows };
  }
}
