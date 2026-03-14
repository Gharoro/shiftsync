import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { In, Repository } from 'typeorm';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { ShiftStatus } from '../common/enums/shift-status.enum';
import { SwapRequestStatus } from '../common/enums/swap-request-status.enum';
import { AuditLog } from '../entities/audit-log.entity';
import { Assignment } from '../entities/assignment.entity';
import { Location } from '../entities/location.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Shift } from '../entities/shift.entity';
import { Skill } from '../entities/skill.entity';
import { SwapRequest } from '../entities/swap-request.entity';
import { User } from '../entities/user.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { ShiftResponseDto } from './dto/shift-response.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { PublishWeekDto } from './dto/publish-week.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SchedulingValidationService } from '../scheduling-validation/scheduling-validation.service';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(ManagerLocation)
    private readonly managerLocationRepository: Repository<ManagerLocation>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(SwapRequest)
    private readonly swapRequestRepository: Repository<SwapRequest>,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
    private readonly schedulingValidation: SchedulingValidationService,
  ) {}

  private async ensureManagerLocation(
    user: User,
    locationId: string,
  ): Promise<void> {
    if (user.role !== UserRole.MANAGER) return;
    const assigned = await this.managerLocationRepository.findOne({
      where: { userId: user.id, locationId },
    });
    if (!assigned) throw new ForbiddenException();
  }

  private toResponseDto(
    shift: Shift & {
      location?: Location;
      requiredSkill?: Skill;
      assignments?: Assignment[];
    },
  ): ShiftResponseDto {
    const location = shift.location;
    const requiredSkill = shift.requiredSkill as
      | { id: string; name: string }
      | undefined;
    const assignments = shift.assignments ?? [];
    return {
      id: shift.id,
      location: {
        id: location?.id ?? shift.locationId,
        name: location?.name ?? '',
        timezone: location?.timezone ?? 'UTC',
      },
      start_time: shift.startTime,
      end_time: shift.endTime,
      required_skill: {
        id: requiredSkill?.id ?? shift.requiredSkillId,
        name: requiredSkill?.name ?? '',
      },
      headcount_needed: shift.headcountNeeded,
      is_premium: shift.isPremium,
      status: shift.status,
      created_by: shift.createdBy,
      created_at: shift.createdAt,
      assignments: assignments.map((a) => ({
        user_id: a.userId,
        full_name: a.user?.fullName ?? '',
        status: a.status,
      })),
    };
  }

  async createShift(
    dto: CreateShiftDto,
    requestingUser: User,
  ): Promise<ShiftResponseDto> {
    if (requestingUser.role === UserRole.MANAGER) {
      await this.ensureManagerLocation(requestingUser, dto.location_id);
    }

    const location = await this.locationRepository.findOne({
      where: { id: dto.location_id },
    });
    if (!location) throw new NotFoundException('Location not found');

    const skill = await this.skillRepository.findOne({
      where: { id: dto.required_skill_id },
    });
    if (!skill) throw new NotFoundException('Skill not found');

    const startTime = new Date(dto.start_time);
    const endTime = new Date(dto.end_time);
    if (endTime.getTime() <= startTime.getTime()) {
      throw new BadRequestException('end_time must be after start_time');
    }

    const shift = this.shiftRepository.create({
      locationId: dto.location_id,
      startTime,
      endTime,
      requiredSkillId: dto.required_skill_id,
      headcountNeeded: dto.headcount_needed ?? 1,
      isPremium: dto.is_premium ?? false,
      status: ShiftStatus.DRAFT,
      createdBy: requestingUser.id,
    });
    const saved = await this.shiftRepository.save(shift);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entityType: 'SHIFT',
        entityId: saved.id,
        locationId: saved.locationId,
        action: 'CREATED',
        afterState: {
          id: saved.id,
          location_id: saved.locationId,
          start_time: saved.startTime,
          end_time: saved.endTime,
          required_skill_id: saved.requiredSkillId,
          headcount_needed: saved.headcountNeeded,
          is_premium: saved.isPremium,
          status: saved.status,
          created_by: saved.createdBy,
        },
        performedBy: requestingUser.id,
      }),
    );

    return this.toResponseDto(
      (await this.shiftRepository.findOne({
        where: { id: saved.id },
        relations: [
          'location',
          'requiredSkill',
          'assignments',
          'assignments.user',
        ],
      })) as Shift,
    );
  }

  async updateShift(
    id: string,
    dto: UpdateShiftDto,
    requestingUser: User,
  ): Promise<ShiftResponseDto> {
    const shift = await this.shiftRepository.findOne({
      where: { id },
      relations: [
        'location',
        'requiredSkill',
        'assignments',
        'assignments.user',
      ],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const editCutoff = await this.schedulingValidation.checkEditCutoff(id);
    if (!editCutoff.passed) {
      throw new BadRequestException(
        (editCutoff as { explanation: string }).explanation,
      );
    }

    await this.ensureManagerLocation(requestingUser, shift.locationId);

    const beforeState = {
      id: shift.id,
      start_time: shift.startTime,
      end_time: shift.endTime,
      required_skill_id: shift.requiredSkillId,
      headcount_needed: shift.headcountNeeded,
      is_premium: shift.isPremium,
      status: shift.status,
    };

    if (dto.start_time != null) shift.startTime = new Date(dto.start_time);
    if (dto.end_time != null) shift.endTime = new Date(dto.end_time);
    if (dto.required_skill_id != null)
      shift.requiredSkillId = dto.required_skill_id;
    if (dto.headcount_needed != null)
      shift.headcountNeeded = dto.headcount_needed;
    if (dto.is_premium !== undefined) shift.isPremium = dto.is_premium;

    const endTime = shift.endTime.getTime();
    const startTime = shift.startTime.getTime();
    if (endTime <= startTime) {
      throw new BadRequestException('end_time must be after start_time');
    }

    await this.shiftRepository.save(shift);

    const afterState = {
      id: shift.id,
      start_time: shift.startTime,
      end_time: shift.endTime,
      required_skill_id: shift.requiredSkillId,
      headcount_needed: shift.headcountNeeded,
      is_premium: shift.isPremium,
      status: shift.status,
    };

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entityType: 'SHIFT',
        entityId: shift.id,
        locationId: shift.locationId,
        action: 'UPDATED',
        beforeState,
        afterState,
        performedBy: requestingUser.id,
      }),
    );

    const pendingSwaps = await this.swapRequestRepository.find({
      where: {
        shiftId: id,
        status: In([
          SwapRequestStatus.PENDING_STAFF,
          SwapRequestStatus.PENDING_MANAGER,
        ]),
      },
      relations: ['requester', 'targetUser'],
    });

    const affectedUserIds = new Set<string>();
    for (const sr of pendingSwaps) {
      affectedUserIds.add(sr.requesterId);
      if (sr.targetUserId) affectedUserIds.add(sr.targetUserId);
    }

    for (const sr of pendingSwaps) {
      await this.swapRequestRepository.update(sr.id, {
        status: SwapRequestStatus.CANCELLED,
        cancelledBy: requestingUser.id,
      });
    }

    for (const userId of affectedUserIds) {
      await this.notificationsService.createNotification(
        userId,
        'Swap request cancelled',
        'Your swap request was cancelled because the shift was edited',
        'SWAP_CANCELLED',
        'SHIFT',
        id,
      );
    }

    const assignedToShift = await this.assignmentRepository.find({
      where: { shiftId: id, status: AssignmentStatus.ACTIVE },
    });
    const assignedUserIds = assignedToShift.map((a) => a.userId);
    this.realtimeService.emitToUsers(assignedUserIds, 'shift_updated', {
      shift_id: id,
      message: 'Shift was updated',
    });

    return this.toResponseDto(
      (await this.shiftRepository.findOne({
        where: { id: shift.id },
        relations: [
          'location',
          'requiredSkill',
          'assignments',
          'assignments.user',
        ],
      })) as Shift,
    );
  }

  async deleteShift(
    id: string,
    requestingUser: User,
  ): Promise<ShiftResponseDto> {
    const shift = await this.shiftRepository.findOne({
      where: { id },
      relations: [
        'location',
        'requiredSkill',
        'assignments',
        'assignments.user',
      ],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    if (shift.status === ShiftStatus.PUBLISHED) {
      throw new BadRequestException(
        'Published shifts cannot be deleted. Unpublish first.',
      );
    }

    await this.ensureManagerLocation(requestingUser, shift.locationId);

    const response = this.toResponseDto(shift);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entityType: 'SHIFT',
        entityId: shift.id,
        locationId: shift.locationId,
        action: 'DELETED',
        afterState: { id: shift.id },
        performedBy: requestingUser.id,
      }),
    );

    await this.assignmentRepository.delete({ shiftId: id });
    await this.shiftRepository.delete(id);

    return response;
  }

  async publishWeek(
    dto: PublishWeekDto,
    requestingUser: User,
  ): Promise<{ count: number }> {
    await this.ensureManagerLocation(requestingUser, dto.location_id);

    const weekStart = DateTime.fromISO(dto.week_start, { zone: 'utc' }).startOf(
      'day',
    );
    const weekEnd = weekStart.plus({ days: 6 }).endOf('day');

    const drafts = await this.shiftRepository.find({
      where: {
        locationId: dto.location_id,
        status: ShiftStatus.DRAFT,
      },
    });

    const inRange = drafts.filter((s) => {
      const start = DateTime.fromJSDate(s.startTime);
      return start >= weekStart && start <= weekEnd;
    });

    const staffUserIds = new Set<string>();
    for (const shift of inRange) {
      shift.status = ShiftStatus.PUBLISHED;
      await this.shiftRepository.save(shift);

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entityType: 'SHIFT',
          entityId: shift.id,
          locationId: shift.locationId,
          action: 'PUBLISHED',
          afterState: { id: shift.id, status: ShiftStatus.PUBLISHED },
          performedBy: requestingUser.id,
        }),
      );

      const assignments = await this.assignmentRepository.find({
        where: { shiftId: shift.id, status: AssignmentStatus.ACTIVE },
      });
      for (const a of assignments) {
        staffUserIds.add(a.userId);
      }
    }

    const weekLabel = weekStart.toFormat('MMMM d, yyyy');
    for (const userId of staffUserIds) {
      await this.notificationsService.createNotification(
        userId,
        'Schedule published',
        `Your schedule for the week of ${weekLabel} has been published`,
        'SCHEDULE_PUBLISHED',
        'SHIFT',
        inRange[0]?.id ?? null,
      );
    }

    this.realtimeService.emitToUsers([...staffUserIds], 'schedule_published', {
      location_id: dto.location_id,
      week_start: dto.week_start,
      message: `Schedule for the week of ${weekLabel} has been published`,
    });

    return { count: inRange.length };
  }

  async unpublishShift(
    id: string,
    requestingUser: User,
  ): Promise<ShiftResponseDto> {
    const shift = await this.shiftRepository.findOne({
      where: { id },
      relations: [
        'location',
        'requiredSkill',
        'assignments',
        'assignments.user',
      ],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const editCutoff = await this.schedulingValidation.checkEditCutoff(id);
    if (!editCutoff.passed) {
      throw new BadRequestException(
        (editCutoff as { explanation: string }).explanation,
      );
    }

    await this.ensureManagerLocation(requestingUser, shift.locationId);

    shift.status = ShiftStatus.DRAFT;
    await this.shiftRepository.save(shift);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entityType: 'SHIFT',
        entityId: shift.id,
        locationId: shift.locationId,
        action: 'UNPUBLISHED',
        afterState: { id: shift.id, status: ShiftStatus.DRAFT },
        performedBy: requestingUser.id,
      }),
    );

    return this.toResponseDto(shift);
  }

  async findByLocationAndDateRange(
    locationId: string,
    startDate: string,
    endDate: string,
    requestingUser: User,
  ): Promise<ShiftResponseDto[]> {
    if (!locationId || !startDate || !endDate) {
      throw new BadRequestException(
        'location_id, start_date, and end_date are required',
      );
    }
    if (requestingUser.role === UserRole.MANAGER) {
      await this.ensureManagerLocation(requestingUser, locationId);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const qb = this.shiftRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.location', 'loc')
      .leftJoinAndSelect('s.requiredSkill', 'skill')
      .leftJoinAndSelect('s.assignments', 'a')
      .leftJoinAndSelect('a.user', 'u')
      .where('s.location_id = :locationId', { locationId })
      .andWhere('s.start_time >= :start', { start })
      .andWhere('s.start_time <= :end', { end });

    if (requestingUser.role === UserRole.STAFF) {
      qb.andWhere('s.status = :published', {
        published: ShiftStatus.PUBLISHED,
      });
    } else {
      qb.andWhere('s.status IN (:...statuses)', {
        statuses: [ShiftStatus.DRAFT, ShiftStatus.PUBLISHED],
      });
    }

    const shifts = await qb.getMany();
    return shifts.map((s) => this.toResponseDto(s));
  }

  async findOne(id: string, requestingUser: User): Promise<ShiftResponseDto> {
    const shift = await this.shiftRepository.findOne({
      where: { id },
      relations: [
        'location',
        'requiredSkill',
        'assignments',
        'assignments.user',
      ],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    if (requestingUser.role === UserRole.MANAGER) {
      await this.ensureManagerLocation(requestingUser, shift.locationId);
    }

    if (
      requestingUser.role === UserRole.STAFF &&
      shift.status === ShiftStatus.DRAFT
    ) {
      throw new NotFoundException('Shift not found');
    }

    return this.toResponseDto(shift);
  }
}
