import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { Assignment } from '../entities/assignment.entity';
import { Location } from '../entities/location.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Shift } from '../entities/shift.entity';
import { Skill } from '../entities/skill.entity';
import { SwapRequest } from '../entities/swap-request.entity';
import { LocationsModule } from '../locations/locations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SchedulingValidationModule } from '../scheduling-validation/scheduling-validation.module';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shift,
      Assignment,
      Location,
      Skill,
      ManagerLocation,
      AuditLog,
      SwapRequest,
    ]),
    LocationsModule,
    NotificationsModule,
    SchedulingValidationModule,
    RealtimeModule,
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [TypeOrmModule, ShiftsService],
})
export class ShiftsModule {}
