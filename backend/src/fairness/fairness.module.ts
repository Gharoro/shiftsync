import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '../entities/assignment.entity';
import { Shift } from '../entities/shift.entity';
import { StaffProfile } from '../entities/staff-profile.entity';
import { StaffDesiredHoursHistory } from '../entities/staff-desired-hours-history.entity';
import { User } from '../entities/user.entity';
import { LocationCertification } from '../entities/location-certification.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Location } from '../entities/location.entity';
import { FairnessController } from './fairness.controller';
import { FairnessService } from './fairness.service';

@Module({
  controllers: [FairnessController],
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      Shift,
      StaffProfile,
      StaffDesiredHoursHistory,
      User,
      LocationCertification,
      ManagerLocation,
      Location,
    ]),
  ],
  providers: [FairnessService],
  exports: [FairnessService],
})
export class FairnessModule {}
