import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class StaffProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiPropertyOptional({ nullable: true })
  hourly_rate: number | null;

  @ApiProperty({ nullable: true })
  notes: string | null;
}

export class StaffDesiredHoursResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  desired_hours: number;

  @ApiProperty()
  effective_from: string;

  @ApiProperty({ nullable: true })
  effective_to: string | null;
}

export class StaffSkillResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  skill_id: string;

  @ApiProperty()
  skill_name: string;
}

export class LocationCertificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  location_id: string;

  @ApiProperty()
  location_name: string;

  @ApiProperty()
  certified_at: string;

  @ApiProperty()
  is_active: boolean;
}

export class ManagerLocationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  location_id: string;

  @ApiProperty()
  location_name: string;

  @ApiProperty()
  assigned_at: string;
}

export class UserDetailResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  full_name: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;

  @ApiPropertyOptional({ type: StaffProfileResponseDto, nullable: true })
  staff_profile?: StaffProfileResponseDto | null;

  @ApiPropertyOptional({ type: [StaffDesiredHoursResponseDto], nullable: true })
  staff_desired_hours_history?: StaffDesiredHoursResponseDto[] | null;

  @ApiPropertyOptional({ type: [StaffSkillResponseDto], nullable: true })
  staff_skills?: StaffSkillResponseDto[] | null;

  @ApiPropertyOptional({
    type: [LocationCertificationResponseDto],
    nullable: true,
  })
  location_certifications?: LocationCertificationResponseDto[] | null;

  @ApiPropertyOptional({ type: [ManagerLocationResponseDto], nullable: true })
  manager_locations?: ManagerLocationResponseDto[] | null;
}
