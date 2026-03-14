import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '../entities/assignment.entity';
import { Shift } from '../entities/shift.entity';
import { StaffProfile } from '../entities/staff-profile.entity';
import { User } from '../entities/user.entity';
import { Settings } from '../entities/settings.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Location } from '../entities/location.entity';
import { SchedulingValidationModule } from '../scheduling-validation/scheduling-validation.module';
import { OverTimeController } from './overtime.controller';
import { OverTimeService } from './overtime.service';

@Module({
  controllers: [OverTimeController],
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      Shift,
      StaffProfile,
      User,
      Settings,
      ManagerLocation,
      Location,
    ]),
    SchedulingValidationModule,
  ],
  providers: [OverTimeService],
  exports: [OverTimeService],
})
export class OverTimeModule {}
