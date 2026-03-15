export interface AssignmentOvertimeDetail {
  assignment_id: string;
  shift_id: string;
  location_name: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  pushes_into_overtime: boolean;
  pushes_into_warning: boolean;
}

export interface StaffOvertimeSummary {
  user_id: string;
  full_name: string;
  hourly_rate: number | null;
  total_projected_hours: number;
  regular_hours: number;
  overtime_hours: number;
  projected_cost: number | null;
  overtime_cost: number | null;
  status: 'NORMAL' | 'WARNING' | 'OVERTIME';
  assignments: AssignmentOvertimeDetail[];
}

export interface WeeklyOvertimeDashboard {
  location_id: string;
  location_name: string;
  week_start: string;
  week_end: string;
  total_projected_cost: number | null;
  total_overtime_cost: number | null;
  staff: StaffOvertimeSummary[];
}
