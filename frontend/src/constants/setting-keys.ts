export const SETTING_KEY_LABELS: Record<string, string> = {
  schedule_edit_cutoff_hours: 'Schedule edit cutoff (hours)',
  week_start_day: 'Week start day',
  daily_hours_warning_threshold: 'Daily hours warning threshold',
  daily_hours_hard_block: 'Daily hours hard block',
  weekly_hours_warning_threshold: 'Weekly hours warning threshold',
  weekly_hours_hard_block: 'Weekly hours hard block',
  consecutive_days_warning: 'Consecutive days warning',
  consecutive_days_hard_block: 'Consecutive days hard block',
  max_pending_swap_requests: 'Max pending swap requests',
  drop_request_expiry_hours: 'Drop request expiry (hours)',
};

export function getSettingKeyLabel(key: string): string {
  return SETTING_KEY_LABELS[key] ?? key;
}
