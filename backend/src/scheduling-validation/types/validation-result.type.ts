export type ConstraintSeverity = 'ERROR' | 'WARNING';

export interface ConstraintViolation {
  passed: false;
  violated_rule: string;
  explanation: string;
  severity: ConstraintSeverity;
  overridable?: boolean;
  suggestions: StaffSuggestion[];
}

export interface ConstraintWarning {
  violated_rule: string;
  explanation: string;
  severity: 'WARNING';
}

export interface ConstraintPass {
  passed: true;
  warnings: ConstraintWarning[];
}

export interface StaffSuggestion {
  user_id: string;
  full_name: string;
  reason: string;
}

export type ConstraintResult = ConstraintViolation | ConstraintPass;

export interface FullValidationResult {
  can_assign: boolean;
  errors: ConstraintViolation[];
  warnings: ConstraintWarning[];
  suggestions: StaffSuggestion[];
}
