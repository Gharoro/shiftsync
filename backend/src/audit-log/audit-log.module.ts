import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { Assignment } from '../entities/assignment.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Shift } from '../entities/shift.entity';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, Shift, Assignment, ManagerLocation]),
  ],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService, TypeOrmModule],
})
export class AuditLogModule {}
