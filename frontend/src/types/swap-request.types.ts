export interface SwapRequestRequesterDto {
  id: string;
  full_name: string;
}

export interface SwapRequestShiftLocationDto {
  id: string;
  name: string;
  timezone: string;
}

export interface SwapRequestShiftSummaryDto {
  id: string;
  location: SwapRequestShiftLocationDto;
  start_time: string;
  end_time: string;
}

export interface SwapRequestTargetUserDto {
  id: string;
  full_name: string;
}

export interface SwapRequestResponseDto {
  id: string;
  type: 'SWAP' | 'DROP';
  requester: SwapRequestRequesterDto;
  shift: SwapRequestShiftSummaryDto;
  target_shift: SwapRequestShiftSummaryDto | null;
  target_user: SwapRequestTargetUserDto | null;
  status: 'PENDING_STAFF' | 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  rejection_reason: string | null;
  expires_at: string;
  created_at: string;
}

export interface CreateSwapRequestDto {
  shift_id: string;
  type: 'SWAP' | 'DROP';
  target_shift_id?: string;
  target_user_id?: string;
}

export interface RespondSwapRequestDto {
  action: 'ACCEPT' | 'REJECT';
}

export interface ManagerDecisionDto {
  action: 'APPROVE' | 'REJECT';
  rejection_reason?: string;
  override_reason?: string;
}

export interface ClaimDropDto {
  shift_id: string;
}
