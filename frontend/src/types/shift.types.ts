export interface ShiftLocationDto {
  id: string;
  name: string;
  timezone: string;
}

export interface ShiftRequiredSkillDto {
  id: string;
  name: string;
}

export interface ShiftAssignmentSummaryDto {
  user_id: string;
  full_name: string;
  status: 'ACTIVE' | 'CANCELLED';
}

export interface ShiftResponseDto {
  id: string;
  location: ShiftLocationDto;
  start_time: string;
  end_time: string;
  required_skill: ShiftRequiredSkillDto;
  headcount_needed: number;
  is_premium: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  created_by: string;
  created_at: string;
  assignments: ShiftAssignmentSummaryDto[];
}

export interface CreateShiftDto {
  location_id: string;
  start_time: string;
  end_time: string;
  required_skill_id: string;
  headcount_needed?: number;
  is_premium?: boolean;
}

export interface UpdateShiftDto {
  start_time?: string;
  end_time?: string;
  required_skill_id?: string;
  headcount_needed?: number;
  is_premium?: boolean;
}

export interface PublishWeekDto {
  location_id: string;
  week_start: string;
}

export interface AssignStaffDto {
  user_id: string;
}

export interface UnassignStaffDto {
  user_id: string;
}

export interface PreviewAssignmentDto {
  user_id: string;
}
