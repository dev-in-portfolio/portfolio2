import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  inviteCode!: string;
}
