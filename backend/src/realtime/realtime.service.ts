import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from '../entities/assignment.entity';
import { Location } from '../entities/location.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Shift } from '../entities/shift.entity';
import { User } from '../entities/user.entity';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import type { OnDutyEntryDto } from './types/on-duty.types';

@Injectable()
export class RealtimeService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(ManagerLocation)
    private readonly managerLocationRepository: Repository<ManagerLocation>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}
  private readonly userSockets = new Map<string, string[]>();

  registerSocket(userId: string, socketId: string): void {
    const list = this.userSockets.get(userId) ?? [];
    if (!list.includes(socketId)) {
      list.push(socketId);
      this.userSockets.set(userId, list);
    }
  }

  removeSocket(socketId: string): void {
    for (const [userId, list] of this.userSockets) {
      const idx = list.indexOf(socketId);
      if (idx !== -1) {
        list.splice(idx, 1);
        if (list.length === 0) this.userSockets.delete(userId);
        else this.userSockets.set(userId, list);
        break;
      }
    }
  }

  getSocketServer(): import('socket.io').Server | null {
    return this.server ?? null;
  }

  setServer(server: import('socket.io').Server): void {
    this.server = server;
  }

  private server: import('socket.io').Server | null = null;

  emitToUser(
    userId: string,
    event: string,
    payload: Record<string, unknown>,
  ): void {
    const socketIds = this.userSockets.get(userId);
    if (!this.server || !socketIds?.length) return;
    for (const id of socketIds) {
      this.server.to(id).emit(event, payload);
    }
  }

  emitToUsers(
    userIds: string[],
    event: string,
    payload: Record<string, unknown>,
  ): void {
    for (const userId of userIds) {
      this.emitToUser(userId, event, payload);
    }
  }

  emitToLocation(
    _locationId: string,
    event: string,
    payload: Record<string, unknown>,
    connectedUserIds: string[],
  ): void {
    this.emitToUsers(connectedUserIds, event, payload);
  }

  async getOnDuty(
    locationId: string,
    requestingUser: User,
  ): Promise<OnDutyEntryDto[]> {
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

    const now = new Date();
    const assignments = await this.assignmentRepository.find({
      where: { status: AssignmentStatus.ACTIVE },
      relations: ['shift', 'shift.location', 'user'],
    });

    const inScope = assignments.filter(
      (a) =>
        a.shift?.locationId === locationId &&
        a.shift &&
        a.shift.startTime <= now &&
        a.shift.endTime >= now,
    );

    return inScope.map((a) => ({
      user_id: a.userId,
      full_name: a.user?.fullName ?? '',
      shift_id: a.shift.id,
      start_time: a.shift.startTime.toISOString(),
      end_time: a.shift.endTime.toISOString(),
      location_name: a.shift.location?.name ?? location.name,
    }));
  }
}
