import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '../entities/assignment.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Shift } from '../entities/shift.entity';
import { SwapRequest } from '../entities/swap-request.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SchedulingValidationModule } from '../scheduling-validation/scheduling-validation.module';
import { SwapRequestsController } from './swap-requests.controller';
import { SwapRequestsService } from './swap-requests.service';

@Module({
  controllers: [SwapRequestsController],
  imports: [
    TypeOrmModule.forFeature([
      SwapRequest,
      Shift,
      Assignment,
      AuditLog,
      ManagerLocation,
    ]),
    NotificationsModule,
    SchedulingValidationModule,
    RealtimeModule,
  ],
  providers: [SwapRequestsService],
  exports: [TypeOrmModule, SwapRequestsService],
})
export class SwapRequestsModule {}
