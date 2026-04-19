import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class FailDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  workerId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  error!: string;

  @IsBoolean()
  @IsOptional()
  retry?: boolean;
}
