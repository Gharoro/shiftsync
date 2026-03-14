import { AssignmentStatus } from '../../common/enums/assignment-status.enum';
import { ShiftStatus } from '../../common/enums/shift-status.enum';

export class ShiftLocationDto {
  id: string;
  name: string;
  timezone: string;
}

export class ShiftRequiredSkillDto {
  id: string;
  name: string;
}

export class ShiftAssignmentSummaryDto {
  user_id: string;
  full_name: string;
  status: AssignmentStatus;
}

export class ShiftResponseDto {
  id: string;
  location: ShiftLocationDto;
  start_time: Date;
  end_time: Date;
  required_skill: ShiftRequiredSkillDto;
  headcount_needed: number;
  is_premium: boolean;
  status: ShiftStatus;
  created_by: string;
  created_at: Date;
  assignments: ShiftAssignmentSummaryDto[];
}
