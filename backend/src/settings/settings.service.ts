import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { Location } from '../entities/location.entity';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Settings } from '../entities/settings.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(ManagerLocation)
    private readonly managerLocationRepository: Repository<ManagerLocation>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async findAll(requestingUser: User): Promise<Settings[]> {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    return this.settingsRepository.find({
      order: { locationId: 'ASC', key: 'ASC' },
    });
  }

  async findByLocation(
    locationId: string,
    requestingUser: User,
  ): Promise<Settings[]> {
    if (
      requestingUser.role !== UserRole.ADMIN &&
      requestingUser.role !== UserRole.MANAGER
    ) {
      throw new ForbiddenException();
    }
    if (requestingUser.role === UserRole.MANAGER) {
      const assigned = await this.managerLocationRepository.findOne({
        where: { userId: requestingUser.id, locationId },
      });
      if (!assigned) {
        throw new ForbiddenException('You are not assigned to this location');
      }
    }

    const locationSettings = await this.settingsRepository.find({
      where: { locationId },
    });
    const globalSettings = await this.settingsRepository.find({
      where: { locationId: IsNull() },
    });
    const byKey = new Map<string, Settings>();
    for (const s of globalSettings) {
      byKey.set(s.key, s);
    }
    for (const s of locationSettings) {
      byKey.set(s.key, s);
    }
    return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  async updateById(
    id: string,
    value: string,
    requestingUser: User,
  ): Promise<Settings> {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    const setting = await this.settingsRepository.findOne({ where: { id } });
    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    setting.value = value;
    setting.updatedBy = requestingUser.id;
    const saved = await this.settingsRepository.save(setting);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entityType: 'SETTINGS',
        entityId: saved.id,
        locationId: saved.locationId,
        action: 'UPSERTED',
        afterState: {
          id: saved.id,
          location_id: saved.locationId,
          key: saved.key,
          value: saved.value,
          updated_by: saved.updatedBy,
        },
        performedBy: requestingUser.id,
      }),
    );

    return saved;
  }

  async upsert(
    locationId: string,
    key: string,
    value: string,
    requestingUser: User,
  ): Promise<Settings> {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    const existing = await this.settingsRepository.findOne({
      where: { locationId, key },
    });

    let setting: Settings;
    if (existing) {
      existing.value = value;
      existing.updatedBy = requestingUser.id;
      setting = await this.settingsRepository.save(existing);
    } else {
      setting = await this.settingsRepository.save(
        this.settingsRepository.create({
          locationId,
          key,
          value,
          updatedBy: requestingUser.id,
        }),
      );
    }

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entityType: 'SETTINGS',
        entityId: setting.id,
        locationId,
        action: 'UPSERTED',
        afterState: {
          id: setting.id,
          location_id: setting.locationId,
          key: setting.key,
          value: setting.value,
          updated_by: setting.updatedBy,
        },
        performedBy: requestingUser.id,
      }),
    );

    return setting;
  }
}
