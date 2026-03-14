import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { Assignment } from '../entities/assignment.entity';
import { Shift } from '../entities/shift.entity';
import { StaffProfile } from '../entities/staff-profile.entity';
import { User } from '../entities/user.entity';
import { Settings } from '../entities/settings.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Location } from '../entities/location.entity';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import {
  AssignmentOvertimeDetail,
  StaffOvertimeSummary,
  WeeklyOvertimeDashboard,
} from './types/overtime.types';

const SETTING_DEFAULTS: Record<string, number> = {
  week_start_day: 0,
  weekly_hours_warning_threshold: 35,
  weekly_hours_hard_block: 40,
};

@Injectable()
export class OverTimeService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(StaffProfile)
    private readonly staffProfileRepository: Repository<StaffProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
    @InjectRepository(ManagerLocation)
    private readonly managerLocationRepository: Repository<ManagerLocation>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  private async getSetting(locationId: string, key: string): Promise<number> {
    const locationSetting = await this.settingsRepository.findOne({
      where: { locationId, key },
    });
    const globalSetting = await this.settingsRepository.findOne({
      where: { key, locationId: IsNull() },
    });
    const raw = locationSetting?.value ?? globalSetting?.value;
    const fallback = SETTING_DEFAULTS[key] ?? 0;
    return raw != null ? parseInt(String(raw), 10) : fallback;
  }

  private async getSettingGlobal(key: string): Promise<number> {
    const globalSetting = await this.settingsRepository.findOne({
      where: { key, locationId: IsNull() },
    });
    const fallback = SETTING_DEFAULTS[key] ?? 0;
    return globalSetting?.value != null
      ? parseInt(String(globalSetting.value), 10)
      : fallback;
  }

  async getWeeklyDashboard(
    locationId: string,
    weekStart: string,
    requestingUser: User,
  ): Promise<WeeklyOvertimeDashboard> {
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

    const [weeklyWarning, weeklyHard] = await Promise.all([
      this.getSetting(locationId, 'weekly_hours_warning_threshold'),
      this.getSetting(locationId, 'weekly_hours_hard_block'),
    ]);

    const tz = location.timezone ?? 'UTC';
    const weekStartLocal = DateTime.fromISO(weekStart, { zone: tz }).startOf(
      'day',
    );
    const weekEndLocal = weekStartLocal.plus({ days: 6 }).endOf('day');
    const weekStartUtc = weekStartLocal.toUTC().toJSDate();
    const weekEndUtc = weekEndLocal.toUTC().toJSDate();

    const assignments = await this.assignmentRepository.find({
      where: { status: AssignmentStatus.ACTIVE },
      relations: ['shift', 'shift.location', 'user'],
    });

    const inScope = assignments.filter(
      (a) =>
        a.shift?.locationId === locationId &&
        a.shift &&
        a.shift.startTime < weekEndUtc &&
        a.shift.endTime > weekStartUtc,
    );

    const byUser = new Map<string, typeof inScope>();
    for (const a of inScope) {
      const list = byUser.get(a.userId) ?? [];
      list.push(a);
      byUser.set(a.userId, list);
    }

    const userIds = [...byUser.keys()];
    const staffProfiles = await this.staffProfileRepository.find({
      where: userIds.map((id) => ({ userId: id })),
    });
    const profileByUser = new Map(staffProfiles.map((p) => [p.userId, p]));

    const staff: StaffOvertimeSummary[] = [];

    for (const [userId, list] of byUser) {
      const user = list[0].user;
      const profile = profileByUser.get(userId);
      const hourlyRateNum =
        profile?.hourlyRate != null ? parseFloat(profile.hourlyRate) : null;

      const assignmentDetails: AssignmentOvertimeDetail[] = [];
      let totalProjectedHours = 0;

      const sorted = [...list].sort(
        (a, b) => a.shift.startTime.getTime() - b.shift.startTime.getTime(),
      );

      let cumulativeHours = 0;
      for (const a of sorted) {
        const s = a.shift;
        const locTz = s.location?.timezone ?? 'UTC';
        const sStart = DateTime.fromJSDate(s.startTime).setZone(locTz);
        const sEnd = DateTime.fromJSDate(s.endTime).setZone(locTz);
        const wStart = weekStartLocal;
        const wEnd = weekEndLocal;
        const overlapStart = sStart > wStart ? sStart : wStart;
        const overlapEnd = sEnd < wEnd ? sEnd : wEnd;
        const durationHours =
          overlapStart < overlapEnd
            ? overlapEnd.diff(overlapStart, 'hours').hours
            : 0;
        totalProjectedHours += durationHours;
        cumulativeHours += durationHours;

        const pushesIntoOvertime = cumulativeHours > weeklyHard;
        const pushesIntoWarning =
          cumulativeHours > weeklyWarning && cumulativeHours <= weeklyHard;

        assignmentDetails.push({
          assignment_id: a.id,
          shift_id: s.id,
          location_name: s.location?.name ?? '',
          start_time: s.startTime.toISOString(),
          end_time: s.endTime.toISOString(),
          duration_hours: Math.round(durationHours * 100) / 100,
          pushes_into_overtime: pushesIntoOvertime,
          pushes_into_warning: pushesIntoWarning,
        });
      }

      const regularHours = Math.min(totalProjectedHours, weeklyHard);
      const overtimeHours = Math.max(0, totalProjectedHours - weeklyHard);
      const projectedCost =
        hourlyRateNum != null
          ? Math.round(totalProjectedHours * hourlyRateNum * 100) / 100
          : null;
      const overtimeCost =
        hourlyRateNum != null
          ? Math.round(overtimeHours * hourlyRateNum * 1.5 * 100) / 100
          : null;

      let status: 'NORMAL' | 'WARNING' | 'OVERTIME' = 'NORMAL';
      if (totalProjectedHours > weeklyHard) status = 'OVERTIME';
      else if (totalProjectedHours > weeklyWarning) status = 'WARNING';

      staff.push({
        user_id: userId,
        full_name: user.fullName,
        hourly_rate: hourlyRateNum,
        total_projected_hours: Math.round(totalProjectedHours * 100) / 100,
        regular_hours: Math.round(regularHours * 100) / 100,
        overtime_hours: Math.round(overtimeHours * 100) / 100,
        projected_cost: projectedCost,
        overtime_cost: overtimeCost,
        status,
        assignments: assignmentDetails,
      });
    }

    let totalProjectedCost: number | null = null;
    let totalOvertimeCost: number | null = null;
    for (const s of staff) {
      if (s.projected_cost != null) {
        totalProjectedCost = (totalProjectedCost ?? 0) + s.projected_cost;
      }
      if (s.overtime_cost != null) {
        totalOvertimeCost = (totalOvertimeCost ?? 0) + s.overtime_cost;
      }
    }
    if (totalProjectedCost != null)
      totalProjectedCost = Math.round(totalProjectedCost * 100) / 100;
    if (totalOvertimeCost != null)
      totalOvertimeCost = Math.round(totalOvertimeCost * 100) / 100;

    return {
      location_id: locationId,
      location_name: location.name,
      week_start: weekStartLocal.toISODate() ?? weekStart,
      week_end: weekEndLocal.toISODate() ?? weekStart,
      total_projected_cost: totalProjectedCost,
      total_overtime_cost: totalOvertimeCost,
      staff,
    };
  }

  async getStaffOvertimeSummary(
    userId: string,
    weekStart: string,
    requestingUser: User,
  ): Promise<StaffOvertimeSummary> {
    if (
      requestingUser.role === UserRole.STAFF &&
      requestingUser.id !== userId
    ) {
      throw new ForbiddenException('You can only view your own summary');
    }

    if (requestingUser.role === UserRole.MANAGER) {
      const managerLocations = await this.managerLocationRepository.find({
        where: { userId: requestingUser.id },
      });
      const locationIds = new Set(managerLocations.map((ml) => ml.locationId));
      const assignmentsOfStaff = await this.assignmentRepository.find({
        where: { userId, status: AssignmentStatus.ACTIVE },
        relations: ['shift'],
      });
      const staffLocationIds = new Set(
        assignmentsOfStaff.map((a) => a.shift?.locationId).filter(Boolean),
      );
      const allowed = [...staffLocationIds].some((id) => locationIds.has(id));
      if (!allowed) {
        throw new ForbiddenException(
          'You can only view staff in your assigned locations',
        );
      }
    }

    const [weeklyWarning, weeklyHard] = await Promise.all([
      this.getSettingGlobal('weekly_hours_warning_threshold'),
      this.getSettingGlobal('weekly_hours_hard_block'),
    ]);

    const assignments = await this.assignmentRepository.find({
      where: { userId, status: AssignmentStatus.ACTIVE },
      relations: ['shift', 'shift.location', 'user'],
    });

    const weekStartUtc = DateTime.fromISO(weekStart).startOf('day').toUTC();
    const weekEndUtc = weekStartUtc.plus({ days: 6 }).endOf('day').toUTC();
    const weekStartUtcDate = weekStartUtc.toJSDate();
    const weekEndUtcDate = weekEndUtc.toJSDate();

    const inScope = assignments.filter(
      (a) =>
        a.shift &&
        a.shift.startTime < weekEndUtcDate &&
        a.shift.endTime > weekStartUtcDate,
    );

    const sorted = [...inScope].sort(
      (a, b) => a.shift.startTime.getTime() - b.shift.startTime.getTime(),
    );

    const assignmentDetails: AssignmentOvertimeDetail[] = [];
    let totalProjectedHours = 0;
    let cumulativeHours = 0;

    for (const a of sorted) {
      const s = a.shift;
      const locTz = s.location?.timezone ?? 'UTC';
      const wStart = DateTime.fromJSDate(weekStartUtcDate).setZone(locTz);
      const wEnd = DateTime.fromJSDate(weekEndUtcDate).setZone(locTz);
      const sStart = DateTime.fromJSDate(s.startTime).setZone(locTz);
      const sEnd = DateTime.fromJSDate(s.endTime).setZone(locTz);
      const overlapStart = sStart > wStart ? sStart : wStart;
      const overlapEnd = sEnd < wEnd ? sEnd : wEnd;
      const durationHours =
        overlapStart < overlapEnd
          ? overlapEnd.diff(overlapStart, 'hours').hours
          : 0;
      totalProjectedHours += durationHours;
      cumulativeHours += durationHours;

      assignmentDetails.push({
        assignment_id: a.id,
        shift_id: s.id,
        location_name: s.location?.name ?? '',
        start_time: s.startTime.toISOString(),
        end_time: s.endTime.toISOString(),
        duration_hours: Math.round(durationHours * 100) / 100,
        pushes_into_overtime: cumulativeHours > weeklyHard,
        pushes_into_warning:
          cumulativeHours > weeklyWarning && cumulativeHours <= weeklyHard,
      });
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.staffProfileRepository.findOne({
      where: { userId },
    });
    const hourlyRateNum =
      profile?.hourlyRate != null ? parseFloat(profile.hourlyRate) : null;

    const regularHours = Math.min(totalProjectedHours, weeklyHard);
    const overtimeHours = Math.max(0, totalProjectedHours - weeklyHard);
    const projectedCost =
      hourlyRateNum != null
        ? Math.round(totalProjectedHours * hourlyRateNum * 100) / 100
        : null;
    const overtimeCost =
      hourlyRateNum != null
        ? Math.round(overtimeHours * hourlyRateNum * 1.5 * 100) / 100
        : null;

    let status: 'NORMAL' | 'WARNING' | 'OVERTIME' = 'NORMAL';
    if (totalProjectedHours > weeklyHard) status = 'OVERTIME';
    else if (totalProjectedHours > weeklyWarning) status = 'WARNING';

    return {
      user_id: userId,
      full_name: user.fullName,
      hourly_rate: hourlyRateNum,
      total_projected_hours: Math.round(totalProjectedHours * 100) / 100,
      regular_hours: Math.round(regularHours * 100) / 100,
      overtime_hours: Math.round(overtimeHours * 100) / 100,
      projected_cost: projectedCost,
      overtime_cost: overtimeCost,
      status,
      assignments: assignmentDetails,
    };
  }
}
