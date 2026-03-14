export interface RoleCount {
  role: string;
  count: string;
}

export interface ShiftStatusRow {
  status: string;
  location_id: string;
  count: string;
}

export interface MultiLocStaffRow {
  full_name: string;
  loc_count: string;
}

export interface PremiumShiftRow {
  id: string;
  location_name: string;
  start_time: Date;
}

export interface DesiredHoursRow {
  full_name: string;
  desired_hours: number;
  effective_from: Date;
  effective_to: string | null;
}
