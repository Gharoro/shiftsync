import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { Assignment } from '../entities/assignment.entity';
import { Shift } from '../entities/shift.entity';
import { AvailabilityWindow } from '../entities/availability-window.entity';
import { StaffSkill } from '../entities/staff-skill.entity';
import { LocationCertification } from '../entities/location-certification.entity';
import { Settings } from '../entities/settings.entity';
import { User } from '../entities/user.entity';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { ShiftStatus } from '../common/enums/shift-status.enum';
import {
  ConstraintResult,
  ConstraintViolation,
  ConstraintWarning,
  FullValidationResult,
  StaffSuggestion,
} from './types/validation-result.type';

const REST_PERIOD_HOURS = 10;
const DEFAULT_EDIT_CUTOFF_HOURS = 48;

const SETTING_DEFAULTS: Record<string, number> = {
  daily_hours_warning_threshold: 8,
  daily_hours_hard_block: 12,
  weekly_hours_warning_threshold: 35,
  weekly_hours_hard_block: 40,
  consecutive_days_warning: 6,
  consecutive_days_hard_block: 7,
  week_start_day: 0,
};

@Injectable()
export class SchedulingValidationService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(AvailabilityWindow)
    private readonly availabilityWindowRepository: Repository<AvailabilityWindow>,
    @InjectRepository(StaffSkill)
    private readonly staffSkillRepository: Repository<StaffSkill>,
    @InjectRepository(LocationCertification)
    private readonly locationCertificationRepository: Repository<LocationCertification>,
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

  async validateAll(
    userId: string,
    shiftId: string,
    requestingUser: User,
  ): Promise<FullValidationResult> {
    const results = await Promise.all([
      this.checkSkill(userId, shiftId),
      this.checkLocationCertification(userId, shiftId),
      this.checkAvailability(userId, shiftId),
      this.checkDoubleBooking(userId, shiftId),
      this.checkRestPeriod(userId, shiftId),
      this.checkDailyHours(userId, shiftId),
      this.checkWeeklyHours(userId, shiftId),
      this.checkConsecutiveDays(userId, shiftId),
    ]);

    const errors: ConstraintViolation[] = [];
    const warnings: ConstraintWarning[] = [];

    for (const r of results) {
      if (!r.passed) {
        errors.push(r);
      } else if (r.warnings?.length) {
        warnings.push(...r.warnings);
      }
    }

    const canOverride =
      requestingUser.role === UserRole.ADMIN ||
      requestingUser.role === UserRole.MANAGER;
    const blockingErrors = errors.filter((e) => !e.overridable || !canOverride);

    const suggestions = errors.length > 0 ? errors[0].suggestions : [];

    return {
      can_assign: blockingErrors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  async checkSkill(userId: string, shiftId: string): Promise<ConstraintResult> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['requiredSkill'],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const staffSkills = await this.staffSkillRepository.find({
      where: { userId },
    });

    const hasSkill = staffSkills.some(
      (ss) => ss.skillId === shift.requiredSkillId,
    );

    if (!hasSkill) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const skillName = shift.requiredSkill?.name ?? 'unknown';
      return {
        passed: false,
        violated_rule: 'SKILL_MISMATCH',
        explanation: `${user?.fullName ?? 'User'} does not have the required skill ${skillName} for this shift`,
        severity: 'ERROR',
        suggestions: await this.getSuggestions(shiftId, userId),
      };
    }

    return { passed: true, warnings: [] };
  }

  async checkLocationCertification(
    userId: string,
    shiftId: string,
  ): Promise<ConstraintResult> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['location'],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const cert = await this.locationCertificationRepository.findOne({
      where: { userId, locationId: shift.locationId, isActive: true },
    });

    if (!cert) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const locationName = shift.location?.name ?? 'unknown';
      return {
        passed: false,
        violated_rule: 'LOCATION_NOT_CERTIFIED',
        explanation: `${user?.fullName ?? 'User'} is not certified to work at ${locationName}`,
        severity: 'ERROR',
        suggestions: await this.getSuggestions(shiftId, userId),
      };
    }

    return { passed: true, warnings: [] };
  }

  async checkAvailability(
    userId: string,
    shiftId: string,
  ): Promise<ConstraintResult> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['location'],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const timezone = shift.location?.timezone ?? 'UTC';
    const localStart = DateTime.fromJSDate(shift.startTime).setZone(timezone);
    const localEnd = DateTime.fromJSDate(shift.endTime).setZone(timezone);
    const localStartDateStr = localStart.toISODate();
    if (!localStartDateStr) throw new NotFoundException('Invalid shift date');
    const localEndDateStr = localEnd.toISODate() ?? '';
    const isOvernight = localStartDateStr !== localEndDateStr;

    const exception = await this.availabilityWindowRepository.findOne({
      where: {
        userId,
        isRecurring: false,
        isAvailable: false,
        exceptionDate: new Date(localStartDateStr),
      },
    });
    if (exception) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      const dateFormatted = localStart.toFormat('MMMM d');
      return {
        passed: false,
        violated_rule: 'AVAILABILITY_EXCEPTION',
        explanation: `${user?.fullName ?? 'User'} has marked themselves unavailable on ${dateFormatted}`,
        severity: 'ERROR',
        suggestions: await this.getSuggestions(shiftId, userId),
      };
    }

    const dayOfWeek = localStart.weekday;
    const dbDayOfWeek = dayOfWeek === 7 ? 0 : dayOfWeek;

    const recurringWindows = await this.availabilityWindowRepository.find({
      where: {
        userId,
        isRecurring: true,
        isAvailable: true,
        dayOfWeek: dbDayOfWeek,
      },
    });

    if (recurringWindows.length === 0) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      const dayName = localStart.toFormat('cccc');
      return {
        passed: false,
        violated_rule: 'NO_AVAILABILITY',
        explanation: `${user?.fullName ?? 'User'} has no availability set for ${dayName}s`,
        severity: 'ERROR',
        suggestions: await this.getSuggestions(shiftId, userId),
      };
    }

    const parseHhMm = (s: string): number => {
      const [h, m] = s.split(':').map((x) => parseInt(x, 10) || 0);
      return h * 60 + m;
    };

    const shiftStartMinutes = localStart.hour * 60 + localStart.minute;
    const shiftEndMinutes = isOvernight
      ? 24 * 60 + localEnd.hour * 60 + localEnd.minute
      : localEnd.hour * 60 + localEnd.minute;

    const checkWithinWindow = (
      win: AvailabilityWindow,
      startMins: number,
      endMins: number,
    ): boolean => {
      const winStart = parseHhMm(win.startTime);
      const winEnd = parseHhMm(win.endTime);
      return startMins >= winStart && endMins <= winEnd;
    };

    if (!isOvernight) {
      const fits = recurringWindows.some((w) =>
        checkWithinWindow(w, shiftStartMinutes, shiftEndMinutes),
      );
      if (!fits) {
        const user = await this.userRepository.findOne({
          where: { id: userId },
        });
        const first = recurringWindows[0];
        const fmtTime = (s: string) => {
          const [h, m] = s.split(':').map((x) => parseInt(x, 10) || 0);
          return DateTime.fromObject({ hour: h, minute: m }).toFormat('h:mm a');
        };
        const dayName = localStart.toFormat('cccc');
        const shiftRange = `${localStart.toFormat('h:mm a')} to ${localEnd.toFormat('h:mm a')}`;
        return {
          passed: false,
          violated_rule: 'OUTSIDE_AVAILABILITY',
          explanation: `${user?.fullName ?? 'User'} is available ${dayName} ${fmtTime(first.startTime)} to ${fmtTime(first.endTime)} but this shift runs ${shiftRange}`,
          severity: 'ERROR',
          suggestions: await this.getSuggestions(shiftId, userId),
        };
      }
    } else {
      const nextDbDay = (dbDayOfWeek + 1) % 7;
      const nextDayWindows = await this.availabilityWindowRepository.find({
        where: {
          userId,
          isRecurring: true,
          isAvailable: true,
          dayOfWeek: nextDbDay,
        },
      });

      const startDayMins = shiftStartMinutes;
      const endDayMins = localEnd.hour * 60 + localEnd.minute;

      const startFits = recurringWindows.some((w) => {
        const winEnd = parseHhMm(w.endTime);
        return startDayMins >= parseHhMm(w.startTime) && startDayMins <= winEnd;
      });
      const endFits =
        nextDayWindows.length > 0 &&
        nextDayWindows.some((w) => {
          const winStart = parseHhMm(w.startTime);
          return endDayMins >= winStart && endDayMins <= parseHhMm(w.endTime);
        });

      if (!startFits || !endFits) {
        const user = await this.userRepository.findOne({
          where: { id: userId },
        });
        const first = recurringWindows[0];
        const fmtTime = (s: string) => {
          const [h, m] = s.split(':').map((x) => parseInt(x, 10) || 0);
          return DateTime.fromObject({ hour: h, minute: m }).toFormat('h:mm a');
        };
        const dayName = localStart.toFormat('cccc');
        const shiftRange = `${localStart.toFormat('h:mm a')} to ${localEnd.toFormat('h:mm a')}`;
        return {
          passed: false,
          violated_rule: 'OUTSIDE_AVAILABILITY',
          explanation: `${user?.fullName ?? 'User'} is available ${dayName} ${fmtTime(first.startTime)} to ${fmtTime(first.endTime)} but this shift runs ${shiftRange}`,
          severity: 'ERROR',
          suggestions: await this.getSuggestions(shiftId, userId),
        };
      }
    }

    return { passed: true, warnings: [] };
  }

  async checkDoubleBooking(
    userId: string,
    shiftId: string,
  ): Promise<ConstraintResult> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const overlapping = await this.assignmentRepository
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.shift', 's')
      .innerJoinAndSelect('s.location', 'l')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.status = :status', { status: AssignmentStatus.ACTIVE })
      .andWhere('s.id != :shiftId', { shiftId })
      .andWhere('s.start_time < :targetEnd', { targetEnd: shift.endTime })
      .andWhere('s.end_time > :targetStart', { targetStart: shift.startTime })
      .getOne();

    if (overlapping) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const existingShift = overlapping.shift;
      const startFormatted = DateTime.fromJSDate(
        existingShift.startTime,
      ).toFormat('h:mm a');
      const endFormatted = DateTime.fromJSDate(existingShift.endTime).toFormat(
        'h:mm a',
      );
      const locationName = existingShift.location?.name ?? 'another location';

      return {
        passed: false,
        violated_rule: 'DOUBLE_BOOKING',
        explanation: `${user?.fullName ?? 'User'} is already assigned to ${locationName} from ${startFormatted} to ${endFormatted} which overlaps with this shift`,
        severity: 'ERROR',
        suggestions: await this.getSuggestions(shiftId, userId),
      };
    }

    return { passed: true, warnings: [] };
  }

  async checkRestPeriod(
    userId: string,
    shiftId: string,
  ): Promise<ConstraintResult> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const targetStart = DateTime.fromJSDate(shift.startTime);
    const targetEnd = DateTime.fromJSDate(shift.endTime);

    const assignments = await this.assignmentRepository.find({
      where: {
        userId,
        status: AssignmentStatus.ACTIVE,
        shiftId: Not(shiftId),
      },
      relations: ['shift', 'shift.location'],
    });

    for (const assignment of assignments) {
      const existingEnd = DateTime.fromJSDate(assignment.shift.endTime);
      const existingStart = DateTime.fromJSDate(assignment.shift.startTime);

      const hoursBeforeTarget = targetStart.diff(existingEnd, 'hours').hours;
      const hoursAfterTarget = existingStart.diff(targetEnd, 'hours').hours;

      if (
        (hoursBeforeTarget >= 0 && hoursBeforeTarget < REST_PERIOD_HOURS) ||
        (hoursAfterTarget >= 0 && hoursAfterTarget < REST_PERIOD_HOURS)
      ) {
        const user = await this.userRepository.findOne({
          where: { id: userId },
        });
        const locationName =
          assignment.shift.location?.name ?? 'another location';
        const gap =
          hoursBeforeTarget >= 0 && hoursBeforeTarget < REST_PERIOD_HOURS
            ? hoursBeforeTarget
            : hoursAfterTarget;
        const gapRounded = Math.floor(gap);

        const violationEnd = existingEnd.toFormat('h:mm a');
        const violationStart = targetStart.toFormat('h:mm a');

        if (hoursBeforeTarget >= 0 && hoursBeforeTarget < REST_PERIOD_HOURS) {
          return {
            passed: false,
            violated_rule: 'INSUFFICIENT_REST',
            explanation: `${user?.fullName ?? 'User'}'s shift at ${locationName} ends at ${violationEnd}, only ${gapRounded} hours before this shift starts at ${violationStart}. Minimum rest is ${REST_PERIOD_HOURS} hours`,
            severity: 'ERROR',
            suggestions: await this.getSuggestions(shiftId, userId),
          };
        }

        return {
          passed: false,
          violated_rule: 'INSUFFICIENT_REST',
          explanation: `${user?.fullName ?? 'User'}'s shift at ${locationName} starts at ${existingStart.toFormat('h:mm a')}, only ${gapRounded} hours after this shift ends at ${targetEnd.toFormat('h:mm a')}. Minimum rest is ${REST_PERIOD_HOURS} hours`,
          severity: 'ERROR',
          suggestions: await this.getSuggestions(shiftId, userId),
        };
      }
    }

    return { passed: true, warnings: [] };
  }

  async checkDailyHours(
    userId: string,
    shiftId: string,
  ): Promise<ConstraintResult> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['location'],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const timezone = shift.location?.timezone ?? 'UTC';
    const localStart = DateTime.fromJSDate(shift.startTime).setZone(timezone);
    const targetDateStr = localStart.toISODate();
    if (!targetDateStr) return { passed: true, warnings: [] };

    const targetDurationHours = DateTime.fromJSDate(shift.endTime).diff(
      DateTime.fromJSDate(shift.startTime),
      'hours',
    ).hours;

    const [dailyWarning, dailyHard] = await Promise.all([
      this.getSetting(shift.locationId, 'daily_hours_warning_threshold'),
      this.getSetting(shift.locationId, 'daily_hours_hard_block'),
    ]);

    const assignments = await this.assignmentRepository.find({
      where: { userId, status: AssignmentStatus.ACTIVE },
      relations: ['shift', 'shift.location'],
    });

    let totalHours = targetDurationHours;
    for (const a of assignments) {
      const s = a.shift;
      if (s.id === shiftId) continue;
      const locTz = s.location?.timezone ?? 'UTC';
      const sStart = DateTime.fromJSDate(s.startTime).setZone(locTz);
      const sDateStr = sStart.toISODate();
      if (sDateStr !== targetDateStr) continue;
      const duration = DateTime.fromJSDate(s.endTime).diff(
        DateTime.fromJSDate(s.startTime),
        'hours',
      ).hours;
      totalHours += duration;
    }

    if (totalHours > dailyHard) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      const dayName = localStart.toFormat('cccc');
      return {
        passed: false,
        violated_rule: 'DAILY_HOURS_EXCEEDED',
        explanation: `Assigning this shift gives ${user?.fullName ?? 'User'} ${Math.round(totalHours)} hours on ${dayName}, exceeding the ${dailyHard} hour daily maximum`,
        severity: 'ERROR',
        suggestions: await this.getSuggestions(shiftId, userId),
      };
    }

    if (totalHours > dailyWarning) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      const dayName = localStart.toFormat('cccc');
      return {
        passed: true,
        warnings: [
          {
            violated_rule: 'DAILY_HOURS_WARNING',
            explanation: `${user?.fullName ?? 'User'} would have ${Math.round(totalHours)} hours on ${dayName}, exceeding the ${dailyWarning} hour recommended daily maximum`,
            severity: 'WARNING',
          },
        ],
      };
    }

    return { passed: true, warnings: [] };
  }

  async checkWeeklyHours(
    userId: string,
    shiftId: string,
  ): Promise<ConstraintResult> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['location'],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const timezone = shift.location?.timezone ?? 'UTC';
    const localStart = DateTime.fromJSDate(shift.startTime).setZone(timezone);
    const weekStartDay = await this.getSetting(
      shift.locationId,
      'week_start_day',
    );
    const [weeklyWarning, weeklyHard] = await Promise.all([
      this.getSetting(shift.locationId, 'weekly_hours_warning_threshold'),
      this.getSetting(shift.locationId, 'weekly_hours_hard_block'),
    ]);

    const weekday = localStart.weekday;
    const daysToWeekStart =
      weekStartDay === 0
        ? weekday === 7
          ? 0
          : weekday
        : weekday - weekStartDay + (weekStartDay > weekday ? 7 : 0);
    const weekStart = localStart
      .minus({ days: daysToWeekStart })
      .startOf('day');
    const weekEnd = weekStart.plus({ days: 6 }).endOf('day');

    const targetStart = DateTime.fromJSDate(shift.startTime);
    const targetEnd = DateTime.fromJSDate(shift.endTime);
    const targetOverlapStart =
      targetStart > weekStart ? targetStart : weekStart;
    const targetOverlapEnd = targetEnd < weekEnd ? targetEnd : weekEnd;
    let totalHours =
      targetStart > weekEnd || targetEnd < weekStart
        ? 0
        : targetOverlapEnd.diff(targetOverlapStart, 'hours').hours;

    const assignments = await this.assignmentRepository.find({
      where: { userId, status: AssignmentStatus.ACTIVE },
      relations: ['shift', 'shift.location'],
    });

    for (const a of assignments) {
      const s = a.shift;
      const sStart = DateTime.fromJSDate(s.startTime);
      const sEnd = DateTime.fromJSDate(s.endTime);
      if (sStart > weekEnd || sEnd < weekStart) continue;
      const overlapStart = sStart > weekStart ? sStart : weekStart;
      const overlapEnd = sEnd < weekEnd ? sEnd : weekEnd;
      totalHours += overlapEnd.diff(overlapStart, 'hours').hours;
    }

    if (totalHours > weeklyHard) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      return {
        passed: false,
        violated_rule: 'WEEKLY_HOURS_EXCEEDED',
        explanation: `Assigning this shift gives ${user?.fullName ?? 'User'} ${Math.round(totalHours)} hours this week, exceeding the ${weeklyHard} hour weekly maximum`,
        severity: 'ERROR',
        suggestions: await this.getSuggestions(shiftId, userId),
      };
    }

    if (totalHours > weeklyWarning) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      return {
        passed: true,
        warnings: [
          {
            violated_rule: 'WEEKLY_HOURS_WARNING',
            explanation: `${user?.fullName ?? 'User'} would have ${Math.round(totalHours)} hours this week, approaching the ${weeklyHard} hour weekly maximum`,
            severity: 'WARNING',
          },
        ],
      };
    }

    return { passed: true, warnings: [] };
  }

  async checkConsecutiveDays(
    userId: string,
    shiftId: string,
  ): Promise<ConstraintResult> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['location'],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const timezone = shift.location?.timezone ?? 'UTC';
    const localStart = DateTime.fromJSDate(shift.startTime).setZone(timezone);
    const targetDateStr = localStart.toISODate();
    if (!targetDateStr) return { passed: true, warnings: [] };

    const [consecWarning, consecHard] = await Promise.all([
      this.getSetting(shift.locationId, 'consecutive_days_warning'),
      this.getSetting(shift.locationId, 'consecutive_days_hard_block'),
    ]);

    const assignments = await this.assignmentRepository.find({
      where: { userId, status: AssignmentStatus.ACTIVE },
      relations: ['shift', 'shift.location'],
    });

    const datesWithShifts = new Set<string>();
    for (const a of assignments) {
      const s = a.shift;
      const locTz = s.location?.timezone ?? 'UTC';
      const start = DateTime.fromJSDate(s.startTime).setZone(locTz);
      const d = start.toISODate();
      if (d) datesWithShifts.add(d);
    }
    datesWithShifts.add(targetDateStr);

    let count = 0;
    let cursor = DateTime.fromISO(targetDateStr);
    for (let i = 0; i < 8; i++) {
      const d = cursor.toISODate();
      if (!d || !datesWithShifts.has(d)) break;
      count++;
      cursor = cursor.minus({ days: 1 });
    }

    if (count >= consecHard) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      return {
        passed: false,
        violated_rule: 'SEVENTH_CONSECUTIVE_DAY',
        explanation: `This would be ${user?.fullName ?? 'User'}'s ${count}th consecutive day worked. A manager override with documented reason is required`,
        severity: 'ERROR',
        overridable: true,
        suggestions: [],
      };
    }

    if (count >= consecWarning) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      return {
        passed: true,
        warnings: [
          {
            violated_rule: 'SIXTH_CONSECUTIVE_DAY',
            explanation: `This would be ${user?.fullName ?? 'User'}'s ${count}th consecutive day worked`,
            severity: 'WARNING',
          },
        ],
      };
    }

    return { passed: true, warnings: [] };
  }

  async checkEditCutoff(shiftId: string): Promise<ConstraintResult> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    if (shift.status === ShiftStatus.DRAFT) {
      return { passed: true, warnings: [] };
    }

    const setting =
      (await this.settingsRepository.findOne({
        where: {
          key: 'schedule_edit_cutoff_hours',
          locationId: shift.locationId,
        },
      })) ??
      (await this.settingsRepository.findOne({
        where: { key: 'schedule_edit_cutoff_hours' },
      }));

    const cutoffHours = setting
      ? parseInt(setting.value, 10)
      : DEFAULT_EDIT_CUTOFF_HOURS;
    const now = DateTime.utc();
    const shiftStart = DateTime.fromJSDate(shift.startTime);
    const cutoffTime = shiftStart.minus({ hours: cutoffHours });

    if (now >= cutoffTime) {
      const hoursUntilStart = Math.floor(shiftStart.diff(now, 'hours').hours);
      return {
        passed: false,
        violated_rule: 'EDIT_CUTOFF_PASSED',
        explanation: `This shift starts in ${hoursUntilStart} hours. Published shifts cannot be edited within ${cutoffHours} hours of start time`,
        severity: 'ERROR',
        suggestions: [],
      };
    }

    return { passed: true, warnings: [] };
  }

  async getSuggestions(
    shiftId: string,
    excludeUserId?: string,
  ): Promise<StaffSuggestion[]> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
    });
    if (!shift) return [];

    const staffWithSkill = await this.staffSkillRepository.find({
      where: { skillId: shift.requiredSkillId },
      select: ['userId'],
    });
    const skillUserIds = new Set(staffWithSkill.map((s) => s.userId));

    const certs = await this.locationCertificationRepository.find({
      where: { locationId: shift.locationId, isActive: true },
      select: ['userId'],
    });
    const certifiedUserIds = new Set(certs.map((c) => c.userId));

    const candidateIds = [...skillUserIds].filter(
      (id) => certifiedUserIds.has(id) && id !== excludeUserId,
    );
    if (candidateIds.length === 0) return [];

    const users = await this.userRepository.find({
      where: { id: In(candidateIds), isActive: true },
      select: ['id', 'fullName'],
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const results = await Promise.all(
      users.map(async (u) => {
        const candidateId = u.id;
        const [doubleBooking, restPeriod, availability] = await Promise.all([
          this.checkDoubleBooking(candidateId, shiftId),
          this.checkRestPeriod(candidateId, shiftId),
          this.checkAvailability(candidateId, shiftId),
        ]);
        const pass =
          doubleBooking.passed && restPeriod.passed && availability.passed;
        return { candidateId, pass };
      }),
    );

    const passedIds = results.filter((r) => r.pass).map((r) => r.candidateId);

    return passedIds.map((id) => {
      const user = userMap.get(id);
      return {
        user_id: id,
        full_name: user?.fullName ?? 'Unknown',
        reason: 'Available and certified for this shift',
      };
    });
  }
}
