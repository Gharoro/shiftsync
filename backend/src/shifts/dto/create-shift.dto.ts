import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsUUID,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateShiftDto {
  @IsUUID()
  location_id: string;

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsUUID()
  required_skill_id: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  headcount_needed?: number;

  @IsOptional()
  @IsBoolean()
  is_premium?: boolean;
}
