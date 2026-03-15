export interface AssignmentResponseDto {
  id: string;
  shift_id: string;
  user_id: string;
  assigned_by: string;
  assigned_at: string;
  status: 'ACTIVE' | 'CANCELLED';
}
