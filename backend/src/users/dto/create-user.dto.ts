import {
  ArrayMinSize,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationPreference } from '../../common/enums/notification-preference.enum';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  full_name: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 80,
    description: 'Required for STAFF role',
  })
  @ValidateIf((o: CreateUserDto) => o.role === UserRole.STAFF)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(80)
  desired_hours?: number;

  @ApiPropertyOptional({ description: 'For STAFF role only' })
  @ValidateIf((o: CreateUserDto) => o.role === UserRole.STAFF)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  hourly_rate?: number;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Required for STAFF role',
  })
  @ValidateIf((o: CreateUserDto) => o.role === UserRole.STAFF)
  @IsOptional()
  @IsUUID('4', { each: true })
  skill_ids?: string[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    minItems: 1,
    description: 'Required for MANAGER and STAFF roles',
  })
  @ValidateIf(
    (o: CreateUserDto) =>
      o.role === UserRole.MANAGER || o.role === UserRole.STAFF,
  )
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  location_ids?: string[];

  @ApiPropertyOptional({ enum: NotificationPreference })
  @IsOptional()
  @IsEnum(NotificationPreference)
  notification_preference?: NotificationPreference;
}
