import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { DeviceKeyGuard } from '../authlite/device-key.guard';
import { CreateJobDto } from './dto/create-job.dto';
import { LeaseDto } from './dto/lease.dto';
import { FailDto } from './dto/fail.dto';

@Controller('api')
@UseGuards(DeviceKeyGuard)
export class JobsController {
  constructor(private jobs: JobsService) {}

  @Post('jobs')
  createJob(@Req() req: any, @Body() dto: CreateJobDto) {
    return this.jobs.createJob(
      req.userId,
      dto.type,
      dto.payload ?? {},
      dto.priority ?? 0,
      dto.maxAttempts ?? 3
    );
  }

  @Get('jobs')
  listJobs(@Req() req: any, @Query('status') status?: string, @Query('limit') limit = '50') {
    const parsed = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return this.jobs.listJobs(req.userId, status, parsed);
  }

  @Get('jobs/:id')
  getJob(@Req() req: any, @Param('id') id: string) {
    return this.jobs.getJob(req.userId, id);
  }

  @Post('jobs/:id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.jobs.cancelJob(req.userId, id);
  }

  @Post('worker/lease')
  lease(@Req() req: any, @Body() dto: LeaseDto) {
    return this.jobs.leaseJobs(req.userId, dto.workerId, dto.leaseSeconds ?? 30, dto.limit ?? 1);
  }

  @Post('worker/:id/succeed')
  succeed(@Req() req: any, @Param('id') id: string, @Body() body: { workerId: string }) {
    return this.jobs.succeedJob(req.userId, id, body.workerId);
  }

  @Post('worker/:id/fail')
  fail(@Req() req: any, @Param('id') id: string, @Body() dto: FailDto) {
    return this.jobs.failJob(req.userId, id, dto.workerId, dto.error, dto.retry ?? true);
  }
}
