import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { StaffProfile } from '../entities/staff-profile.entity';
import { StaffDesiredHoursHistory } from '../entities/staff-desired-hours-history.entity';
import { StaffSkill } from '../entities/staff-skill.entity';
import { LocationCertification } from '../entities/location-certification.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      StaffProfile,
      StaffDesiredHoursHistory,
      StaffSkill,
      LocationCertification,
      ManagerLocation,
    ]),
    AuditLogModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
