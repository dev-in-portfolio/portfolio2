import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DeviceKeyGuard } from '../authlite/device-key.guard';

@Controller('api/dashboard')
@UseGuards(DeviceKeyGuard)
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('summary')
  summary(@Req() req: any) {
    return this.dashboard.summary(req.userId);
  }

  @Get('failures')
  failures(@Req() req: any, @Query('limit') limit = '50') {
    const parsed = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return this.dashboard.failures(req.userId, parsed);
  }
}
