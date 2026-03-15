import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { Assignment } from '../entities/assignment.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Shift } from '../entities/shift.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(ManagerLocation)
    private readonly managerLocationRepository: Repository<ManagerLocation>,
  ) {}

  async findByShift(
    shiftId: string,
    requestingUser: User,
  ): Promise<AuditLog[]> {
    if (
      requestingUser.role !== UserRole.ADMIN &&
      requestingUser.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException();
    }

    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
    });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (requestingUser.role === UserRole.MANAGER) {
      const assigned = await this.managerLocationRepository.findOne({
        where: { userId: requestingUser.id, locationId: shift.locationId },
      });
      if (!assigned) {
        throw new ForbiddenException(
          "You are not assigned to this shift's location",
        );
      }
    }

    const assignments = await this.assignmentRepository.find({
      where: { shiftId },
    });
    const assignmentIds = assignments.map((r) => r.id);

    if (assignmentIds.length === 0) {
      return this.auditLogRepository.find({
        where: { entityType: 'SHIFT', entityId: shiftId },
        order: { performedAt: 'DESC' },
      });
    }
    return this.auditLogRepository.find({
      where: [
        { entityType: 'SHIFT', entityId: shiftId },
        { entityType: 'ASSIGNMENT', entityId: In(assignmentIds) },
      ],
      order: { performedAt: 'DESC' },
    });
  }

  async findByLocationAndDateRange(
    locationId: string,
    startDate: string,
    endDate: string,
    requestingUser: User,
  ): Promise<AuditLog[]> {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.auditLogRepository.find({
      where: {
        locationId,
        performedAt: Between(start, end),
      },
      order: { performedAt: 'DESC' },
    });
  }

  async exportLogs(
    locationId: string,
    startDate: string,
    endDate: string,
    requestingUser: User,
  ): Promise<string> {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const logs = await this.auditLogRepository.find({
      where: {
        locationId,
        performedAt: Between(start, end),
      },
      order: { performedAt: 'ASC' },
    });
    return this.toCsv(logs);
  }

  private toCsv(logs: AuditLog[]): string {
    const header =
      'performed_at,entity_type,entity_id,action,performed_by,before_state,after_state';
    const escape = (v: unknown): string => {
      if (v == null) return '""';
      if (typeof v === 'object') {
        const s = JSON.stringify(v);
        return `"${s.replace(/"/g, '""')}"`;
      }
      // v is string | number | boolean | symbol | bigint here
      const s =
        typeof v === 'string'
          ? v
          : typeof v === 'number' || typeof v === 'boolean'
            ? String(v)
            : // eslint-disable-next-line @typescript-eslint/no-base-to-string -- primitive symbol/bigint
              String(v);
      return s.includes('"') || s.includes(',') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : `"${s}"`;
    };
    const rows = logs.map((l) =>
      [
        l.performedAt.toISOString(),
        l.entityType,
        l.entityId,
        l.action,
        l.performedBy,
        l.beforeState != null ? JSON.stringify(l.beforeState) : '',
        l.afterState != null ? JSON.stringify(l.afterState) : '',
      ]
        .map(escape)
        .join(','),
    );
    return [header, ...rows].join('\n');
  }
}
