export interface UserResponseDto {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  is_active: boolean;
  created_at: string;
}

export interface AuthResponseDto {
  access_token: string;
  user: UserResponseDto;
}

export interface StaffProfileResponseDto {
  id: string;
  user_id: string;
  hourly_rate: number | null;
  notes: string | null;
}

export interface StaffDesiredHoursResponseDto {
  id: string;
  user_id: string;
  desired_hours: number;
  effective_from: string;
  effective_to: string | null;
}

export interface StaffSkillResponseDto {
  id: string;
  skill_id: string;
  skill_name: string;
}

export interface LocationCertificationResponseDto {
  id: string;
  location_id: string;
  location_name: string;
  certified_at: string;
  is_active: boolean;
}

export interface ManagerLocationResponseDto {
  id: string;
  location_id: string;
  location_name: string;
  assigned_at: string;
}

export interface UserDetailResponseDto {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  staff_profile?: StaffProfileResponseDto | null;
  staff_desired_hours_history?: StaffDesiredHoursResponseDto[] | null;
  staff_skills?: StaffSkillResponseDto[] | null;
  location_certifications?: LocationCertificationResponseDto[] | null;
  manager_locations?: ManagerLocationResponseDto[] | null;
}

export type CurrentUser = UserResponseDto;

export interface CreateUserDto {
  email: string;
  full_name: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  desired_hours?: number;
  hourly_rate?: number;
  skill_ids?: string[];
  location_ids?: string[];
  notification_preference?: 'IN_APP' | 'IN_APP_AND_EMAIL';
}

export interface UpdateUserDto {
  full_name?: string;
  is_active?: boolean;
  desired_hours?: number;
  hourly_rate?: number;
  skill_ids?: string[];
  location_ids?: string[];
  notification_preference?: 'IN_APP' | 'IN_APP_AND_EMAIL';
}
