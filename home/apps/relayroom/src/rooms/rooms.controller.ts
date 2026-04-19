import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { DeviceKeyGuard } from '../authlite/device-key.guard';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';

@Controller('api/rooms')
@UseGuards(DeviceKeyGuard)
export class RoomsController {
  constructor(private rooms: RoomsService) {}

  @Post()
  createRoom(@Req() req: any, @Body() dto: CreateRoomDto) {
    return this.rooms.createRoom(req.userId, dto.name);
  }

  @Get()
  listRooms(@Req() req: any) {
    return this.rooms.listRooms(req.userId);
  }

  @Get(':id')
  getRoom(@Req() req: any, @Param('id') id: string) {
    return this.rooms.getRoom(req.userId, id);
  }

  @Delete(':id')
  deleteRoom(@Req() req: any, @Param('id') id: string) {
    return this.rooms.deleteRoom(req.userId, id);
  }

  @Post('join')
  joinRoom(@Req() req: any, @Body() dto: JoinRoomDto) {
    return this.rooms.joinRoom(req.userId, dto.inviteCode);
  }

  @Get(':id/members')
  listMembers(@Req() req: any, @Param('id') id: string) {
    return this.rooms.listMembers(req.userId, id);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Req() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string
  ) {
    return this.rooms.removeMember(req.userId, id, userId);
  }
}
