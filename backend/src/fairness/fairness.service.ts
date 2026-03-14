import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { Assignment } from '../entities/assignment.entity';
import { Shift } from '../entities/shift.entity';
import { StaffDesiredHoursHistory } from '../entities/staff-desired-hours-history.entity';
import { User } from '../entities/user.entity';
import { LocationCertification } from '../entities/location-certification.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Location } from '../entities/location.entity';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import {
  FairnessReport,
  FairnessReportStaffEntry,
  HoursDistributionEntry,
} from './types/fairness.types';

@Injectable()
export class FairnessService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(StaffDesiredHoursHistory)
    private readonly desiredHoursRepository: Repository<StaffDesiredHoursHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(LocationCertification)
    private readonly locationCertificationRepository: Repository<LocationCertification>,
    @InjectRepository(ManagerLocation)
    private readonly managerLocationRepository: Repository<ManagerLocation>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  async getHoursDistribution(
    locationId: string,
    startDate: string,
    endDate: string,
    requestingUser: User,
  ): Promise<HoursDistributionEntry[]> {
    if (requestingUser.role === UserRole.MANAGER) {
      const assigned = await this.managerLocationRepository.findOne({
        where: { userId: requestingUser.id, locationId },
      });
      if (!assigned) {
        throw new ForbiddenException('You are not assigned to this location');
      }
    }

    const periodStart = DateTime.fromISO(startDate).startOf('day').toJSDate();
    const periodEnd = DateTime.fromISO(endDate).endOf('day').toJSDate();

    const assignments = await this.assignmentRepository.find({
      where: { status: AssignmentStatus.ACTIVE },
      relations: ['shift', 'user'],
    });

    const inScope = assignments.filter(
      (a) =>
        a.shift?.locationId === locationId &&
        a.shift &&
        a.shift.startTime < periodEnd &&
        a.shift.endTime > periodStart,
    );

    const byUser = new Map<
      string,
      { user: User; totalHours: number; shiftCount: number }
    >();
    for (const a of inScope) {
      const s = a.shift;
      const overlapStart =
        s.startTime > periodStart ? s.startTime : periodStart;
      const overlapEnd = s.endTime < periodEnd ? s.endTime : periodEnd;
      const hours =
        overlapStart < overlapEnd
          ? (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60)
          : 0;
      const existing = byUser.get(a.userId);
      if (existing) {
        existing.totalHours += hours;
        existing.shiftCount += 1;
      } else {
        byUser.set(a.userId, {
          user: a.user,
          totalHours: hours,
          shiftCount: 1,
        });
      }
    }

    const result: HoursDistributionEntry[] = [...byUser.entries()].map(
      ([userId, { user, totalHours, shiftCount }]) => ({
        user_id: userId,
        full_name: user.fullName,
        total_hours_assigned: Math.round(totalHours * 100) / 100,
        shift_count: shiftCount,
      }),
    );
    result.sort((a, b) => b.total_hours_assigned - a.total_hours_assigned);
    return result;
  }

  async getFairnessReport(
    locationId: string,
    startDate: string,
    endDate: string,
    requestingUser: User,
  ): Promise<FairnessReport> {
    if (requestingUser.role === UserRole.MANAGER) {
      const assigned = await this.managerLocationRepository.findOne({
        where: { userId: requestingUser.id, locationId },
      });
      if (!assigned) {
        throw new ForbiddenException('You are not assigned to this location');
      }
    }

    const location = await this.locationRepository.findOne({
      where: { id: locationId },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const periodStart = DateTime.fromISO(startDate).startOf('day');
    const periodEnd = DateTime.fromISO(endDate).endOf('day');
    const periodDays = periodEnd.diff(periodStart, 'days').days + 1;
    const periodStartDate = periodStart.toJSDate();
    const periodEndDate = periodEnd.toJSDate();

    const certifications = await this.locationCertificationRepository.find({
      where: { locationId, isActive: true },
      relations: ['user'],
    });
    const certifiedUserIds = certifications.map((c) => c.userId);

    const assignments = await this.assignmentRepository.find({
      where: { status: AssignmentStatus.ACTIVE },
      relations: ['shift', 'user'],
    });

    const locationAssignments = assignments.filter(
      (a) =>
        a.shift?.locationId === locationId &&
        a.shift &&
        a.shift.startTime < periodEndDate &&
        a.shift.endTime > periodStartDate,
    );

    let totalPremiumShifts = 0;
    const byUser = new Map<
      string,
      { totalHours: number; premiumCount: number; user: User }
    >();
    for (const a of locationAssignments) {
      const s = a.shift;
      if (s.isPremium) totalPremiumShifts += 1;
      const overlapStart =
        s.startTime > periodStartDate ? s.startTime : periodStartDate;
      const overlapEnd = s.endTime < periodEndDate ? s.endTime : periodEndDate;
      const hours =
        overlapStart < overlapEnd
          ? (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60)
          : 0;
      const existing = byUser.get(a.userId);
      if (existing) {
        existing.totalHours += hours;
        if (s.isPremium) existing.premiumCount += 1;
      } else {
        byUser.set(a.userId, {
          user: a.user,
          totalHours: hours,
          premiumCount: s.isPremium ? 1 : 0,
        });
      }
    }

    const desiredHoursRows = await this.desiredHoursRepository.find({
      where: { userId: In(certifiedUserIds), effectiveTo: IsNull() },
    });
    const desiredByUser = new Map<string, number>();
    for (const row of desiredHoursRows) {
      desiredByUser.set(row.userId, row.desiredHours);
    }

    const staff: FairnessReportStaffEntry[] = [];
    for (const userId of certifiedUserIds) {
      const user = certifications.find((c) => c.userId === userId)?.user;
      if (!user) continue;
      const stats = byUser.get(userId);
      const totalHoursAssigned = stats
        ? Math.round(stats.totalHours * 100) / 100
        : 0;
      const premiumShiftsAssigned = stats?.premiumCount ?? 0;
      const desiredHours = desiredByUser.get(userId) ?? null;
      const scaledDesired =
        desiredHours != null ? desiredHours * (periodDays / 7) : null;
      const hoursVariance =
        scaledDesired != null
          ? Math.round((totalHoursAssigned - scaledDesired) * 100) / 100
          : null;
      const premiumFairnessScore =
        totalPremiumShifts > 0
          ? Math.round(
              (premiumShiftsAssigned / totalPremiumShifts) * 100 * 100,
            ) / 100
          : 0;

      staff.push({
        user_id: userId,
        full_name: user.fullName,
        total_hours_assigned: totalHoursAssigned,
        premium_shifts_assigned: premiumShiftsAssigned,
        desired_hours: desiredHours,
        hours_variance: hoursVariance,
        premium_fairness_score: premiumFairnessScore,
      });
    }

    const scores = staff.map((s) => s.premium_fairness_score);
    const locationPremiumFairnessScore = standardDeviation(scores);

    return {
      location_id: locationId,
      location_name: location.name,
      period_start: startDate,
      period_end: endDate,
      total_premium_shifts: totalPremiumShifts,
      staff,
      location_premium_fairness_score:
        Math.round(locationPremiumFairnessScore * 100) / 100,
    };
  }
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquared = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquared);
}
