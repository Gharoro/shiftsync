import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateShiftDto } from './create-shift.dto';

export class UpdateShiftDto extends PartialType(
  OmitType(CreateShiftDto, ['location_id'] as const),
) {}
