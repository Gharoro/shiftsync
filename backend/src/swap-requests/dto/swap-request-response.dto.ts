import { SwapRequestStatus } from '../../common/enums/swap-request-status.enum';
import { SwapRequestType } from '../../common/enums/swap-request-type.enum';

export class SwapRequestRequesterDto {
  id: string;
  full_name: string;
}

export class SwapRequestShiftLocationDto {
  id: string;
  name: string;
  timezone: string;
}

export class SwapRequestShiftSummaryDto {
  id: string;
  location: SwapRequestShiftLocationDto;
  start_time: Date;
  end_time: Date;
}

export class SwapRequestTargetUserDto {
  id: string;
  full_name: string;
}

export class SwapRequestResponseDto {
  id: string;
  type: SwapRequestType;
  requester: SwapRequestRequesterDto;
  shift: SwapRequestShiftSummaryDto;
  target_shift: SwapRequestShiftSummaryDto | null;
  target_user: SwapRequestTargetUserDto | null;
  status: SwapRequestStatus;
  rejection_reason: string | null;
  expires_at: Date;
  created_at: Date;
}
