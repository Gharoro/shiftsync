export interface HoursDistributionEntry {
  user_id: string;
  full_name: string;
  total_hours_assigned: number;
  shift_count: number;
}

export interface FairnessReportStaffEntry {
  user_id: string;
  full_name: string;
  total_hours_assigned: number;
  premium_shifts_assigned: number;
  desired_hours: number | null;
  hours_variance: number | null;
  premium_fairness_score: number;
}

export interface FairnessReport {
  location_id: string;
  location_name: string;
  period_start: string;
  period_end: string;
  total_premium_shifts: number;
  staff: FairnessReportStaffEntry[];
  location_premium_fairness_score: number;
}
