import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, Repository } from 'typeorm';
import { NotificationPreference } from '../common/enums/notification-preference.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuditLog } from '../entities/audit-log.entity';
import { LocationCertification } from '../entities/location-certification.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { StaffDesiredHoursHistory } from '../entities/staff-desired-hours-history.entity';
import { StaffProfile } from '../entities/staff-profile.entity';
import { StaffSkill } from '../entities/staff-skill.entity';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import {
  LocationCertificationResponseDto,
  ManagerLocationResponseDto,
  StaffDesiredHoursResponseDto,
  StaffProfileResponseDto,
  StaffSkillResponseDto,
  UserDetailResponseDto,
} from './dto/user-detail-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StaffProfile)
    private readonly staffProfileRepository: Repository<StaffProfile>,
    @InjectRepository(StaffDesiredHoursHistory)
    private readonly staffDesiredHoursRepository: Repository<StaffDesiredHoursHistory>,
    @InjectRepository(StaffSkill)
    private readonly staffSkillRepository: Repository<StaffSkill>,
    @InjectRepository(LocationCertification)
    private readonly locationCertificationRepository: Repository<LocationCertification>,
    @InjectRepository(ManagerLocation)
    private readonly managerLocationRepository: Repository<ManagerLocation>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async createUser(
    dto: CreateUserDto,
    createdBy: User,
  ): Promise<UserDetailResponseDto> {
    if (createdBy.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException();
    }
    const passwordHash = await bcrypt.hash('Password1234!', SALT_ROUNDS);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      fullName: dto.full_name,
      role: dto.role,
      notificationPreference:
        dto.notification_preference ?? NotificationPreference.IN_APP,
    });
    const savedUser = await this.userRepository.save(user);
    if (dto.role === UserRole.STAFF) {
      await this.staffProfileRepository.save(
        this.staffProfileRepository.create({
          userId: savedUser.id,
          hourlyRate: dto.hourly_rate != null ? String(dto.hourly_rate) : null,
        }),
      );
      const today = new Date().toISOString().split('T')[0];
      const desiredHours = dto.desired_hours ?? 20;
      await this.staffDesiredHoursRepository.save(
        this.staffDesiredHoursRepository.create({
          userId: savedUser.id,
          desiredHours,
          effectiveFrom: today,
          effectiveTo: null,
        }),
      );
      if (dto.skill_ids?.length) {
        for (const skillId of dto.skill_ids) {
          await this.staffSkillRepository.save(
            this.staffSkillRepository.create({
              userId: savedUser.id,
              skillId,
            }),
          );
        }
      }
      if (dto.location_ids?.length) {
        for (const locationId of dto.location_ids) {
          await this.locationCertificationRepository.save(
            this.locationCertificationRepository.create({
              userId: savedUser.id,
              locationId,
            }),
          );
        }
      }
    }
    if (dto.role === UserRole.MANAGER && dto.location_ids?.length) {
      for (const locationId of dto.location_ids) {
        await this.managerLocationRepository.save(
          this.managerLocationRepository.create({
            userId: savedUser.id,
            locationId,
            assignedBy: createdBy.id,
          }),
        );
      }
    }
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entityType: 'USER',
        entityId: savedUser.id,
        action: 'CREATED',
        afterState: {
          id: savedUser.id,
          email: savedUser.email,
          full_name: savedUser.fullName,
          role: savedUser.role,
          is_active: savedUser.isActive,
        },
        performedBy: createdBy.id,
      }),
    );
    return this.toUserDetailResponse(
      await this.loadUserWithRelations(savedUser.id),
    );
  }

  async findAll(requestingUser: User): Promise<UserDetailResponseDto[]> {
    if (requestingUser.role === UserRole.STAFF) {
      throw new ForbiddenException();
    }
    let users: User[];
    if (requestingUser.role === UserRole.ADMIN) {
      users = await this.userRepository.find({
        order: { createdAt: 'DESC' },
      });
    } else {
      const managerLocations = await this.managerLocationRepository.find({
        where: { userId: requestingUser.id },
      });
      const locationIds = managerLocations.map((ml) => ml.locationId);
      if (locationIds.length === 0) {
        users = [];
      } else {
        const certifiedUserIds = await this.locationCertificationRepository
          .createQueryBuilder('lc')
          .select('DISTINCT lc.user_id')
          .where('lc.location_id IN (:...ids)', { ids: locationIds })
          .getRawMany();
        const managerUserIds = await this.managerLocationRepository
          .createQueryBuilder('ml')
          .select('DISTINCT ml.user_id')
          .where('ml.location_id IN (:...ids)', { ids: locationIds })
          .getRawMany();
        const userIds = new Set([
          ...certifiedUserIds.map((r: { user_id: string }) => r.user_id),
          ...managerUserIds.map((r: { user_id: string }) => r.user_id),
        ]);
        users = await this.userRepository.find({
          where: Array.from(userIds).map((uid) => ({ id: uid })),
          order: { createdAt: 'DESC' },
        });
      }
    }
    const result: UserDetailResponseDto[] = [];
    for (const u of users) {
      result.push(
        await this.toUserDetailResponse(await this.loadUserWithRelations(u.id)),
      );
    }
    return result;
  }

  async findOne(
    id: string,
    requestingUser: User,
  ): Promise<UserDetailResponseDto> {
    if (requestingUser.role === UserRole.STAFF && requestingUser.id !== id) {
      throw new ForbiddenException();
    }
    if (requestingUser.role === UserRole.MANAGER && requestingUser.id !== id) {
      const managerLocations = await this.managerLocationRepository.find({
        where: { userId: requestingUser.id },
      });
      const managerLocationIds = new Set(
        managerLocations.map((ml) => ml.locationId),
      );
      const certs = await this.locationCertificationRepository.find({
        where: { userId: id },
      });
      const mgrs = await this.managerLocationRepository.find({
        where: { userId: id },
      });
      const userLocIds = new Set([
        ...certs.map((c) => c.locationId),
        ...mgrs.map((m) => m.locationId),
      ]);
      const overlap = [...managerLocationIds].some((lid) =>
        userLocIds.has(lid),
      );
      if (!overlap) {
        throw new ForbiddenException();
      }
    }
    const user = await this.loadUserWithRelations(id);
    if (!user) {
      throw new NotFoundException();
    }
    return this.toUserDetailResponse(user);
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    requestingUser: User,
  ): Promise<UserDetailResponseDto> {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException();
    }
    const beforeState = {
      id: user.id,
      full_name: user.fullName,
      is_active: user.isActive,
    };
    if (dto.full_name !== undefined) user.fullName = dto.full_name;
    if (dto.notification_preference !== undefined)
      user.notificationPreference = dto.notification_preference;
    if (dto.hourly_rate !== undefined && user.role === UserRole.STAFF) {
      const profile = await this.staffProfileRepository.findOne({
        where: { userId: user.id },
      });
      if (profile) {
        profile.hourlyRate =
          dto.hourly_rate != null ? String(dto.hourly_rate) : null;
        await this.staffProfileRepository.save(profile);
      }
    }
    if (dto.desired_hours !== undefined && user.role === UserRole.STAFF) {
      const today = new Date().toISOString().split('T')[0];
      const current = await this.staffDesiredHoursRepository.findOne({
        where: { userId: user.id, effectiveTo: IsNull() },
      });
      if (current) {
        current.effectiveTo = new Date(today);
        await this.staffDesiredHoursRepository.save(current);
      }
      await this.staffDesiredHoursRepository.save(
        this.staffDesiredHoursRepository.create({
          userId: user.id,
          desiredHours: dto.desired_hours,
          effectiveFrom: today,
          effectiveTo: null,
        }),
      );
    }
    if (dto.skill_ids !== undefined && user.role === UserRole.STAFF) {
      await this.staffSkillRepository.delete({ userId: user.id });
      for (const skillId of dto.skill_ids) {
        await this.staffSkillRepository.save(
          this.staffSkillRepository.create({ userId: user.id, skillId }),
        );
      }
    }
    if (dto.location_ids !== undefined) {
      if (user.role === UserRole.STAFF) {
        await this.locationCertificationRepository.delete({ userId: user.id });
        for (const locationId of dto.location_ids) {
          await this.locationCertificationRepository.save(
            this.locationCertificationRepository.create({
              userId: user.id,
              locationId,
            }),
          );
        }
      }
      if (user.role === UserRole.MANAGER) {
        await this.managerLocationRepository.delete({ userId: user.id });
        for (const locationId of dto.location_ids) {
          await this.managerLocationRepository.save(
            this.managerLocationRepository.create({
              userId: user.id,
              locationId,
              assignedBy: requestingUser.id,
            }),
          );
        }
      }
    }
    await this.userRepository.save(user);
    const afterState = {
      id: user.id,
      full_name: user.fullName,
      is_active: user.isActive,
      notification_preference: user.notificationPreference,
    };
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entityType: 'USER',
        entityId: user.id,
        action: 'UPDATED',
        beforeState,
        afterState,
        performedBy: requestingUser.id,
      }),
    );
    return this.toUserDetailResponse(await this.loadUserWithRelations(user.id));
  }

  async deactivateUser(
    id: string,
    requestingUser: User,
  ): Promise<UserDetailResponseDto> {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException();
    }
    user.isActive = false;
    await this.userRepository.save(user);
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entityType: 'USER',
        entityId: user.id,
        action: 'DEACTIVATED',
        afterState: { id: user.id, is_active: false },
        performedBy: requestingUser.id,
      }),
    );
    return this.toUserDetailResponse(await this.loadUserWithRelations(user.id));
  }

  private async loadUserWithRelations(id: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id },
      relations: [],
    }) as Promise<User>;
  }

  private async toUserDetailResponse(
    user: User,
  ): Promise<UserDetailResponseDto> {
    const base = {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      is_active: user.isActive,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };
    if (user.role === UserRole.STAFF) {
      const [profile, history, skills, certs] = await Promise.all([
        this.staffProfileRepository.findOne({ where: { userId: user.id } }),
        this.staffDesiredHoursRepository.find({
          where: { userId: user.id },
          order: { effectiveFrom: 'DESC' },
        }),
        this.staffSkillRepository.find({
          where: { userId: user.id },
          relations: ['skill'],
        }),
        this.locationCertificationRepository.find({
          where: { userId: user.id },
          relations: ['location'],
        }),
      ]);
      const staffProfile: StaffProfileResponseDto | null = profile
        ? {
            id: profile.id,
            user_id: profile.userId,
            hourly_rate:
              profile.hourlyRate != null
                ? parseFloat(profile.hourlyRate)
                : null,
            notes: profile.notes,
          }
        : null;
      const staffDesiredHoursHistory: StaffDesiredHoursResponseDto[] =
        history.map((h) => ({
          id: h.id,
          user_id: h.userId,
          desired_hours: h.desiredHours,
          effective_from: h.effectiveFrom.toString(),
          effective_to: h.effectiveTo?.toString() ?? null,
        }));
      const staffSkills: StaffSkillResponseDto[] = skills.map((s) => ({
        id: s.id,
        skill_id: s.skillId,
        skill_name:
          (s as StaffSkill & { skill: { name: string } }).skill?.name ?? '',
      }));
      const locationCertifications: LocationCertificationResponseDto[] =
        certs.map((c) => ({
          id: c.id,
          location_id: c.locationId,
          location_name:
            (c as LocationCertification & { location: { name: string } })
              .location?.name ?? '',
          certified_at: c.certifiedAt.toISOString(),
          is_active: c.isActive,
        }));
      return {
        ...base,
        staff_profile: staffProfile,
        staff_desired_hours_history: staffDesiredHoursHistory,
        staff_skills: staffSkills,
        location_certifications: locationCertifications,
        manager_locations: null,
      };
    }
    if (user.role === UserRole.MANAGER) {
      const managerLocs = await this.managerLocationRepository.find({
        where: { userId: user.id },
        relations: ['location'],
      });
      const managerLocations: ManagerLocationResponseDto[] = managerLocs.map(
        (m) => ({
          id: m.id,
          location_id: m.locationId,
          location_name:
            (m as ManagerLocation & { location: { name: string } }).location
              ?.name ?? '',
          assigned_at: m.assignedAt.toISOString(),
        }),
      );
      return {
        ...base,
        staff_profile: null,
        staff_desired_hours_history: null,
        staff_skills: null,
        location_certifications: null,
        manager_locations: managerLocations,
      };
    }
    return {
      ...base,
      staff_profile: null,
      staff_desired_hours_history: null,
      staff_skills: null,
      location_certifications: null,
      manager_locations: null,
    };
  }
}
