import { IsUUID } from 'class-validator';

export class ClaimDropDto {
  @IsUUID()
  shift_id: string;
}
