import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '../entities/assignment.entity';
import { Shift } from '../entities/shift.entity';
import { AvailabilityWindow } from '../entities/availability-window.entity';
import { StaffSkill } from '../entities/staff-skill.entity';
import { LocationCertification } from '../entities/location-certification.entity';
import { Settings } from '../entities/settings.entity';
import { User } from '../entities/user.entity';
import { SchedulingValidationService } from './scheduling-validation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      Shift,
      AvailabilityWindow,
      StaffSkill,
      LocationCertification,
      Settings,
      User,
    ]),
  ],
  providers: [SchedulingValidationService],
  exports: [SchedulingValidationService],
})
export class SchedulingValidationModule {}
