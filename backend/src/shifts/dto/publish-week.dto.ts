import { IsDateString, IsUUID } from 'class-validator';

export class PublishWeekDto {
  @IsUUID()
  location_id: string;

  @IsDateString()
  week_start: string;
}
