import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { In, IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { SwapRequestStatus } from '../common/enums/swap-request-status.enum';
import { SwapRequestType } from '../common/enums/swap-request-type.enum';
import { Assignment } from '../entities/assignment.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Shift } from '../entities/shift.entity';
import { SwapRequest } from '../entities/swap-request.entity';
import { User } from '../entities/user.entity';
import { SwapRequestRespondAction } from '../common/enums/swap-request-respond-action.enum';
import { ManagerDecisionAction } from '../common/enums/manager-decision-action.enum';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { RespondSwapRequestDto } from './dto/respond-swap-request.dto';
import { ManagerDecisionDto } from './dto/manager-decision.dto';
import { ClaimDropDto } from './dto/claim-drop.dto';
import {
  SwapRequestResponseDto,
  SwapRequestShiftSummaryDto,
} from './dto/swap-request-response.dto';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SchedulingValidationService } from '../scheduling-validation/scheduling-validation.service';

@Injectable()
export class SwapRequestsService {
  constructor(
    @InjectRepository(SwapRequest)
    private readonly swapRequestRepository: Repository<SwapRequest>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(ManagerLocation)
    private readonly managerLocationRepository: Repository<ManagerLocation>,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
    private readonly schedulingValidation: SchedulingValidationService,
  ) {}

  private toShiftSummary(
    shift: Shift & {
      location?: { id: string; name: string; timezone: string };
    },
  ): SwapRequestShiftSummaryDto {
    const location = shift.location;
    return {
      id: shift.id,
      location: {
        id: location?.id ?? shift.locationId,
        name: location?.name ?? '',
        timezone: location?.timezone ?? 'UTC',
      },
      start_time: shift.startTime,
      end_time: shift.endTime,
    };
  }

  private readonly swapRequestRelations = [
    'requester',
    'shift',
    'shift.location',
    'targetShift',
    'targetShift.location',
    'targetUser',
  ] as const;

  private async loadWithRelations(id: string): Promise<
    SwapRequest & {
      requester?: User;
      shift?: Shift & {
        location?: { id: string; name: string; timezone: string };
        locationId: string;
      };
      targetShift?:
        | (Shift & {
            location?: { id: string; name: string; timezone: string };
          })
        | null;
      targetUser?: User | null;
    }
  > {
    return (await this.swapRequestRepository.findOne({
      where: { id },
      relations: [...this.swapRequestRelations],
    })) as SwapRequest & {
      requester?: User;
      shift?: Shift & {
        location?: { id: string; name: string; timezone: string };
        locationId: string;
      };
      targetShift?:
        | (Shift & {
            location?: { id: string; name: string; timezone: string };
          })
        | null;
      targetUser?: User | null;
    };
  }

  private async notifyManagersForLocation(
    locationId: string,
    title: string,
    body: string,
    type: string,
    relatedEntityId: string,
  ): Promise<void> {
    const managers = await this.managerLocationRepository.find({
      where: { locationId },
    });
    for (const ml of managers) {
      await this.notificationsService.createNotification(
        ml.userId,
        title,
        body,
        type,
        'SWAP_REQUEST',
        relatedEntityId,
      );
    }
  }

  private toResponseDto(
    sr: SwapRequest & {
      requester?: User;
      shift?: Shift & {
        location?: { id: string; name: string; timezone: string };
      };
      targetShift?:
        | (Shift & {
            location?: { id: string; name: string; timezone: string };
          })
        | null;
      targetUser?: User | null;
    },
  ): SwapRequestResponseDto {
    const type =
      sr.targetShiftId != null ? SwapRequestType.SWAP : SwapRequestType.DROP;
    return {
      id: sr.id,
      type,
      requester: {
        id: sr.requesterId,
        full_name: sr.requester?.fullName ?? '',
      },
      shift: this.toShiftSummary(
        (sr.shift as Shift & {
          location?: { id: string; name: string; timezone: string };
        }) ?? {
          id: sr.shiftId,
          locationId: '',
          startTime: new Date(),
          endTime: new Date(),
        },
      ),
      target_shift: sr.targetShift
        ? this.toShiftSummary(
            sr.targetShift as Shift & {
              location?: { id: string; name: string; timezone: string };
            },
          )
        : null,
      target_user: sr.targetUser
        ? { id: sr.targetUserId!, full_name: sr.targetUser.fullName }
        : null,
      status: sr.status,
      rejection_reason: sr.rejectionReason,
      expires_at: sr.expiresAt,
      created_at: sr.createdAt,
    };
  }

  async createSwapRequest(
    dto: CreateSwapRequestDto,
    requestingUser: User,
  ): Promise<SwapRequestResponseDto> {
    if (requestingUser.role !== UserRole.STAFF) {
      throw new ForbiddenException();
    }

    const shift = await this.shiftRepository.findOne({
      where: { id: dto.shift_id },
      relations: ['location'],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const myAssignment = await this.assignmentRepository.findOne({
      where: {
        shiftId: dto.shift_id,
        userId: requestingUser.id,
        status: AssignmentStatus.ACTIVE,
      },
    });
    if (!myAssignment) {
      throw new BadRequestException('You are not assigned to this shift');
    }

    const pendingCount = await this.swapRequestRepository.count({
      where: {
        requesterId: requestingUser.id,
        status: In([
          SwapRequestStatus.PENDING_STAFF,
          SwapRequestStatus.PENDING_MANAGER,
        ]),
      },
    });
    if (pendingCount >= 3) {
      throw new BadRequestException(
        'You already have 3 pending swap or drop requests',
      );
    }

    const status = SwapRequestStatus.PENDING_STAFF;
    const expiresAt = DateTime.fromJSDate(shift.startTime)
      .minus({ hours: 24 })
      .toJSDate();
    let targetShiftId: string | null = null;
    let targetUserId: string | null = null;

    if (dto.type === SwapRequestType.SWAP) {
      if (!dto.target_shift_id || !dto.target_user_id) {
        throw new BadRequestException(
          'target_shift_id and target_user_id are required for SWAP requests',
        );
      }

      const targetShift = await this.shiftRepository.findOne({
        where: { id: dto.target_shift_id },
        relations: ['location'],
      });
      if (!targetShift) throw new NotFoundException('Target shift not found');

      const targetAssignment = await this.assignmentRepository.findOne({
        where: {
          shiftId: dto.target_shift_id,
          userId: dto.target_user_id,
          status: AssignmentStatus.ACTIVE,
        },
      });
      if (!targetAssignment) {
        throw new BadRequestException(
          'Target staff member is not assigned to the target shift',
        );
      }

      const validationRequesterOnTarget =
        await this.schedulingValidation.validateAll(
          requestingUser.id,
          dto.target_shift_id,
          requestingUser,
        );
      if (!validationRequesterOnTarget.can_assign) {
        const firstError = validationRequesterOnTarget.errors[0];
        const explanation = firstError?.explanation ?? 'Validation failed';
        throw new BadRequestException(explanation);
      }

      const validationTargetOnOriginal =
        await this.schedulingValidation.validateAll(
          dto.target_user_id,
          dto.shift_id,
          requestingUser,
        );
      if (!validationTargetOnOriginal.can_assign) {
        const firstError = validationTargetOnOriginal.errors[0];
        const explanation = firstError?.explanation ?? 'Validation failed';
        throw new BadRequestException(
          `Target staff member cannot cover your shift: ${explanation}`,
        );
      }

      targetShiftId = dto.target_shift_id;
      targetUserId = dto.target_user_id;
    }

    const swapRequest = this.swapRequestRepository.create({
      requesterId: requestingUser.id,
      shiftId: dto.shift_id,
      targetShiftId,
      targetUserId,
      status,
      expiresAt,
    });
    const saved = await this.swapRequestRepository.save(swapRequest);

    if (dto.type === SwapRequestType.SWAP && targetUserId) {
      await this.notificationsService.createNotification(
        targetUserId,
        'Swap request',
        `Staff member ${requestingUser.fullName} has requested to swap shifts with you`,
        'SWAP_REQUEST',
        'SWAP_REQUEST',
        saved.id,
      );
      const savedWithRelations = await this.swapRequestRepository.findOne({
        where: { id: saved.id },
        relations: ['shift', 'shift.location', 'requester'],
      });
      const shiftSummary = savedWithRelations?.shift
        ? this.toShiftSummary(
            savedWithRelations.shift as Shift & {
              location?: { id: string; name: string; timezone: string };
            },
          )
        : null;
      this.realtimeService.emitToUser(targetUserId, 'swap_requested', {
        swap_request_id: saved.id,
        requester_name: requestingUser.fullName,
        shift: shiftSummary,
      });
    }

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entityType: 'SWAP_REQUEST',
        entityId: saved.id,
        action: 'CREATED',
        afterState: {
          id: saved.id,
          shift_id: saved.shiftId,
          type: dto.type,
          status: saved.status,
        },
        performedBy: requestingUser.id,
      }),
    );

    return this.toResponseDto(
      (await this.swapRequestRepository.findOne({
        where: { id: saved.id },
        relations: [
          'requester',
          'shift',
          'shift.location',
          'targetShift',
          'targetShift.location',
          'targetUser',
        ],
      })) as SwapRequest & {
        requester?: User;
        shift?: Shift & {
          location?: { id: string; name: string; timezone: string };
        };
        targetShift?:
          | (Shift & {
              location?: { id: string; name: string; timezone: string };
            })
          | null;
        targetUser?: User | null;
      },
    );
  }

  async cancelSwapRequest(
    swapRequestId: string,
    requestingUser: User,
  ): Promise<SwapRequestResponseDto> {
    const sr = await this.swapRequestRepository.findOne({
      where: { id: swapRequestId },
      relations: [
        'requester',
        'shift',
        'shift.location',
        'targetShift',
        'targetShift.location',
        'targetUser',
      ],
    });
    if (!sr) throw new NotFoundException('Swap request not found');

    if (sr.requesterId !== requestingUser.id) {
      throw new ForbiddenException();
    }

    if (
      sr.status !== SwapRequestStatus.PENDING_STAFF &&
      sr.status !== SwapRequestStatus.PENDING_MANAGER
    ) {
      throw new BadRequestException('This request can no longer be cancelled');
    }

    const wasPendingManager = sr.status === SwapRequestStatus.PENDING_MANAGER;

    sr.status = SwapRequestStatus.CANCELLED;
    sr.cancelledBy = requestingUser.id;
    await this.swapRequestRepository.save(sr);

    if (wasPendingManager && sr.shift) {
      const shift = sr.shift as Shift & { locationId: string };
      const managerLocation = await this.managerLocationRepository.findOne({
        where: { locationId: shift.locationId },
      });
      if (managerLocation) {
        await this.notificationsService.createNotification(
          managerLocation.userId,
          'Swap request cancelled',
          `A swap request has been cancelled by ${requestingUser.fullName}`,
          'SWAP_CANCELLED',
          'SWAP_REQUEST',
          sr.id,
        );
      }
    }

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entityType: 'SWAP_REQUEST',
        entityId: sr.id,
        action: 'CANCELLED',
        afterState: { id: sr.id, status: SwapRequestStatus.CANCELLED },
        performedBy: requestingUser.id,
      }),
    );

    return this.toResponseDto(sr);
  }

  async respondToSwap(
    swapRequestId: string,
    dto: RespondSwapRequestDto,
    requestingUser: User,
  ): Promise<SwapRequestResponseDto> {
    const sr = await this.loadWithRelations(swapRequestId);
    if (!sr) throw new NotFoundException('Swap request not found');

    if (sr.targetShiftId == null) {
      throw new BadRequestException('Cannot respond to a DROP request');
    }
    if (sr.targetUserId !== requestingUser.id) {
      throw new ForbiddenException();
    }
    if (sr.status !== SwapRequestStatus.PENDING_STAFF) {
      throw new BadRequestException(
        'This request is no longer awaiting your response',
      );
    }

    if (dto.action === SwapRequestRespondAction.REJECT) {
      sr.status = SwapRequestStatus.REJECTED;
      await this.swapRequestRepository.save(sr);

      this.realtimeService.emitToUser(sr.requesterId, 'swap_rejected', {
        swap_request_id: sr.id,
      });

      await this.notificationsService.createNotification(
        sr.requesterId,
        'Swap request rejected',
        `Your swap request was rejected by ${requestingUser.fullName}`,
        'SWAP_REJECTED',
        'SWAP_REQUEST',
        sr.id,
      );

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entityType: 'SWAP_REQUEST',
          entityId: sr.id,
          action: 'REJECTED',
          afterState: { id: sr.id, status: SwapRequestStatus.REJECTED },
          performedBy: requestingUser.id,
        }),
      );
    } else {
      sr.status = SwapRequestStatus.PENDING_MANAGER;
      await this.swapRequestRepository.save(sr);

      this.realtimeService.emitToUser(sr.requesterId, 'swap_accepted', {
        swap_request_id: sr.id,
      });

      const shift = sr.shift as Shift & { locationId: string };
      await this.notifyManagersForLocation(
        shift.locationId,
        'Swap request approval needed',
        'A swap request requires your approval',
        'SWAP_NEEDS_APPROVAL',
        sr.id,
      );

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entityType: 'SWAP_REQUEST',
          entityId: sr.id,
          action: 'ACCEPTED',
          afterState: { id: sr.id, status: SwapRequestStatus.PENDING_MANAGER },
          performedBy: requestingUser.id,
        }),
      );
    }

    return this.toResponseDto(
      (await this.loadWithRelations(sr.id)) as Parameters<
        typeof this.toResponseDto
      >[0],
    );
  }

  async claimDrop(
    dto: ClaimDropDto,
    requestingUser: User,
  ): Promise<SwapRequestResponseDto> {
    if (requestingUser.role !== UserRole.STAFF) {
      throw new ForbiddenException();
    }

    const sr = await this.swapRequestRepository.findOne({
      where: {
        shiftId: dto.shift_id,
        targetShiftId: IsNull(),
        targetUserId: IsNull(),
        status: SwapRequestStatus.PENDING_STAFF,
      },
      relations: [...this.swapRequestRelations],
    });
    if (!sr) throw new NotFoundException('Drop request not found');

    if (new Date() > sr.expiresAt) {
      throw new BadRequestException('This drop request has expired');
    }

    const validation = await this.schedulingValidation.validateAll(
      requestingUser.id,
      dto.shift_id,
      requestingUser,
    );
    if (!validation.can_assign) {
      const firstError = validation.errors[0];
      throw new BadRequestException(
        firstError?.explanation ?? 'Validation failed',
      );
    }

    sr.targetUserId = requestingUser.id;
    sr.status = SwapRequestStatus.PENDING_MANAGER;
    await this.swapRequestRepository.save(sr);

    const shift = sr.shift as Shift & { locationId: string };
    await this.notifyManagersForLocation(
      shift.locationId,
      'Drop request claimed',
      `A drop request has been claimed by ${requestingUser.fullName} and requires your approval`,
      'DROP_CLAIMED',
      sr.id,
    );

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entityType: 'SWAP_REQUEST',
        entityId: sr.id,
        action: 'CLAIMED',
        afterState: {
          id: sr.id,
          status: SwapRequestStatus.PENDING_MANAGER,
          target_user_id: requestingUser.id,
        },
        performedBy: requestingUser.id,
      }),
    );

    return this.toResponseDto(
      (await this.loadWithRelations(sr.id)) as Parameters<
        typeof this.toResponseDto
      >[0],
    );
  }

  async managerDecision(
    swapRequestId: string,
    dto: ManagerDecisionDto,
    requestingUser: User,
  ): Promise<SwapRequestResponseDto> {
    if (
      requestingUser.role !== UserRole.ADMIN &&
      requestingUser.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException();
    }

    const sr = await this.loadWithRelations(swapRequestId);
    if (!sr) throw new NotFoundException('Swap request not found');

    if (sr.status !== SwapRequestStatus.PENDING_MANAGER) {
      throw new BadRequestException(
        'This request is not awaiting manager decision',
      );
    }

    if (requestingUser.role === UserRole.MANAGER) {
      const shift = sr.shift as Shift & { locationId: string };
      const assigned = await this.managerLocationRepository.findOne({
        where: { userId: requestingUser.id, locationId: shift.locationId },
      });
      if (!assigned) throw new ForbiddenException();
    }

    if (dto.action === ManagerDecisionAction.REJECT) {
      if (!dto.rejection_reason?.trim()) {
        throw new BadRequestException(
          'rejection_reason is required when rejecting',
        );
      }
      sr.status = SwapRequestStatus.REJECTED;
      sr.rejectionReason = dto.rejection_reason;
      await this.swapRequestRepository.save(sr);

      this.realtimeService.emitToUser(
        sr.requesterId,
        'swap_rejected_by_manager',
        {
          swap_request_id: sr.id,
          rejection_reason: dto.rejection_reason,
        },
      );

      await this.notificationsService.createNotification(
        sr.requesterId,
        'Request rejected',
        `Your swap/drop request was rejected by manager. Reason: ${dto.rejection_reason}`,
        'SWAP_REJECTED',
        'SWAP_REQUEST',
        sr.id,
      );

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entityType: 'SWAP_REQUEST',
          entityId: sr.id,
          action: 'REJECTED',
          afterState: {
            id: sr.id,
            status: SwapRequestStatus.REJECTED,
            rejection_reason: dto.rejection_reason,
          },
          performedBy: requestingUser.id,
        }),
      );
    } else {
      const isSwap = sr.targetShiftId != null;

      if (isSwap) {
        const validationRequester = await this.schedulingValidation.validateAll(
          sr.requesterId,
          sr.targetShiftId!,
          requestingUser,
        );
        if (!validationRequester.can_assign) {
          const firstError = validationRequester.errors[0];
          throw new BadRequestException(
            firstError?.explanation ?? 'Validation failed for requester',
          );
        }
        if (sr.targetUserId) {
          const validationTarget = await this.schedulingValidation.validateAll(
            sr.targetUserId,
            sr.shiftId,
            requestingUser,
          );
          if (!validationTarget.can_assign) {
            const firstError = validationTarget.errors[0];
            throw new BadRequestException(
              firstError?.explanation ?? 'Validation failed for target user',
            );
          }
        }
      } else if (sr.targetUserId) {
        const validationClaimer = await this.schedulingValidation.validateAll(
          sr.targetUserId,
          sr.shiftId,
          requestingUser,
        );
        if (!validationClaimer.can_assign) {
          const firstError = validationClaimer.errors[0];
          throw new BadRequestException(
            firstError?.explanation ?? 'Validation failed for claimer',
          );
        }
      }

      const afterState: { assignments: unknown[] } = { assignments: [] };

      if (isSwap && sr.targetUserId) {
        const reqAssignment = await this.assignmentRepository.findOne({
          where: {
            shiftId: sr.shiftId,
            userId: sr.requesterId,
            status: AssignmentStatus.ACTIVE,
          },
        });
        if (reqAssignment) {
          reqAssignment.status = AssignmentStatus.CANCELLED;
          await this.assignmentRepository.save(reqAssignment);
          afterState.assignments.push({
            assignment_id: reqAssignment.id,
            action: 'CANCELLED',
            user_id: sr.requesterId,
            shift_id: sr.shiftId,
          });
        }

        const targetAssignment = await this.assignmentRepository.findOne({
          where: {
            shiftId: sr.targetShiftId!,
            userId: sr.targetUserId,
            status: AssignmentStatus.ACTIVE,
          },
        });
        if (targetAssignment) {
          targetAssignment.status = AssignmentStatus.CANCELLED;
          await this.assignmentRepository.save(targetAssignment);
          afterState.assignments.push({
            assignment_id: targetAssignment.id,
            action: 'CANCELLED',
            user_id: sr.targetUserId,
            shift_id: sr.targetShiftId,
          });
        }

        await this.assignmentRepository.save(
          this.assignmentRepository.create({
            shiftId: sr.targetShiftId!,
            userId: sr.requesterId,
            assignedBy: requestingUser.id,
          }),
        );
        afterState.assignments.push({
          action: 'CREATED',
          user_id: sr.requesterId,
          shift_id: sr.targetShiftId,
        });

        await this.assignmentRepository.save(
          this.assignmentRepository.create({
            shiftId: sr.shiftId,
            userId: sr.targetUserId,
            assignedBy: requestingUser.id,
          }),
        );
        afterState.assignments.push({
          action: 'CREATED',
          user_id: sr.targetUserId,
          shift_id: sr.shiftId,
        });
      } else {
        const reqAssignment = await this.assignmentRepository.findOne({
          where: {
            shiftId: sr.shiftId,
            userId: sr.requesterId,
            status: AssignmentStatus.ACTIVE,
          },
        });
        if (reqAssignment) {
          reqAssignment.status = AssignmentStatus.CANCELLED;
          await this.assignmentRepository.save(reqAssignment);
          afterState.assignments.push({
            assignment_id: reqAssignment.id,
            action: 'CANCELLED',
            user_id: sr.requesterId,
            shift_id: sr.shiftId,
          });
        }

        await this.assignmentRepository.save(
          this.assignmentRepository.create({
            shiftId: sr.shiftId,
            userId: sr.targetUserId!,
            assignedBy: requestingUser.id,
          }),
        );
        afterState.assignments.push({
          action: 'CREATED',
          user_id: sr.targetUserId,
          shift_id: sr.shiftId,
        });
      }

      sr.status = SwapRequestStatus.APPROVED;
      await this.swapRequestRepository.save(sr);

      this.realtimeService.emitToUsers(
        sr.targetUserId ? [sr.requesterId, sr.targetUserId] : [sr.requesterId],
        'swap_approved',
        { swap_request_id: sr.id },
      );

      await this.notificationsService.createNotification(
        sr.requesterId,
        'Request approved',
        'Your swap/drop request has been approved',
        'SWAP_APPROVED',
        'SWAP_REQUEST',
        sr.id,
      );
      if (sr.targetUserId) {
        await this.notificationsService.createNotification(
          sr.targetUserId,
          'Request approved',
          'Your swap/drop request has been approved',
          'SWAP_APPROVED',
          'SWAP_REQUEST',
          sr.id,
        );
      }

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entityType: 'SWAP_REQUEST',
          entityId: sr.id,
          action: 'APPROVED',
          afterState: {
            id: sr.id,
            status: SwapRequestStatus.APPROVED,
            ...afterState,
          },
          performedBy: requestingUser.id,
        }),
      );
    }

    return this.toResponseDto(
      (await this.loadWithRelations(sr.id)) as Parameters<
        typeof this.toResponseDto
      >[0],
    );
  }

  async findAvailableDrops(
    requestingUser: User,
  ): Promise<SwapRequestResponseDto[]> {
    if (requestingUser.role !== UserRole.STAFF) {
      throw new ForbiddenException();
    }

    const drops = await this.swapRequestRepository.find({
      where: {
        targetShiftId: IsNull(),
        targetUserId: IsNull(),
        status: SwapRequestStatus.PENDING_STAFF,
        expiresAt: MoreThan(new Date()),
      },
      relations: [...this.swapRequestRelations],
    });

    const result: SwapRequestResponseDto[] = [];
    for (const sr of drops) {
      const validation = await this.schedulingValidation.validateAll(
        requestingUser.id,
        sr.shiftId,
        requestingUser,
      );
      if (validation.can_assign) {
        result.push(
          this.toResponseDto(sr as Parameters<typeof this.toResponseDto>[0]),
        );
      }
    }
    return result;
  }

  async findPending(requestingUser: User): Promise<SwapRequestResponseDto[]> {
    let list: SwapRequest[];

    if (requestingUser.role === UserRole.ADMIN) {
      list = await this.swapRequestRepository.find({
        where: {
          status: In([
            SwapRequestStatus.PENDING_STAFF,
            SwapRequestStatus.PENDING_MANAGER,
          ]),
        },
        relations: [...this.swapRequestRelations],
      });
    } else if (requestingUser.role === UserRole.MANAGER) {
      const managerLocs = await this.managerLocationRepository.find({
        where: { userId: requestingUser.id },
      });
      const locationIds = managerLocs.map((ml) => ml.locationId);
      if (locationIds.length === 0) {
        list = [];
      } else {
        list = await this.swapRequestRepository
          .createQueryBuilder('sr')
          .innerJoinAndSelect('sr.requester', 'requester')
          .innerJoinAndSelect('sr.shift', 'shift')
          .innerJoinAndSelect('shift.location', 'shiftLocation')
          .leftJoinAndSelect('sr.targetShift', 'targetShift')
          .leftJoinAndSelect('targetShift.location', 'targetShiftLocation')
          .leftJoinAndSelect('sr.targetUser', 'targetUser')
          .where('sr.status = :status', {
            status: SwapRequestStatus.PENDING_MANAGER,
          })
          .andWhere('shift.location_id IN (:...locationIds)', { locationIds })
          .getMany();
      }
    } else {
      list = await this.swapRequestRepository.find({
        where: [
          {
            requesterId: requestingUser.id,
            status: In([
              SwapRequestStatus.PENDING_STAFF,
              SwapRequestStatus.PENDING_MANAGER,
            ]),
          },
          {
            targetUserId: requestingUser.id,
            status: In([
              SwapRequestStatus.PENDING_STAFF,
              SwapRequestStatus.PENDING_MANAGER,
            ]),
          },
        ],
        relations: [...this.swapRequestRelations],
      });
    }

    return list.map((sr) =>
      this.toResponseDto(sr as Parameters<typeof this.toResponseDto>[0]),
    );
  }

  async expireStaleRequests(): Promise<void> {
    const stale = await this.swapRequestRepository.find({
      where: {
        status: SwapRequestStatus.PENDING_STAFF,
        expiresAt: LessThan(new Date()),
      },
      relations: ['requester'],
    });

    for (const sr of stale) {
      sr.status = SwapRequestStatus.EXPIRED;
      await this.swapRequestRepository.save(sr);

      await this.notificationsService.createNotification(
        sr.requesterId,
        'Request expired',
        'Your drop request has expired with no coverage found',
        'SWAP_EXPIRED',
        'SWAP_REQUEST',
        sr.id,
      );

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entityType: 'SWAP_REQUEST',
          entityId: sr.id,
          action: 'EXPIRED',
          afterState: { id: sr.id, status: SwapRequestStatus.EXPIRED },
          performedBy: sr.requesterId,
        }),
      );
    }
  }

  @Cron('*/15 * * * *')
  runExpireStaleRequests(): void {
    void this.expireStaleRequests();
  }
}
