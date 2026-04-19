import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  type!: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, any>;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxAttempts?: number;
}
