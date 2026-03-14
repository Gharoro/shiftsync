import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SwapRequestType } from '../../common/enums/swap-request-type.enum';

export class CreateSwapRequestDto {
  @IsUUID()
  shift_id: string;

  @IsEnum(SwapRequestType)
  type: SwapRequestType;

  @IsOptional()
  @IsUUID()
  target_shift_id?: string;

  @IsOptional()
  @IsUUID()
  target_user_id?: string;
}
