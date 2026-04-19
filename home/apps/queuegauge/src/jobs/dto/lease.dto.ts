import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class LeaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  workerId!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  leaseSeconds?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
