import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { ManagerLocation } from '../../entities/manager-location.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class LocationGuard implements CanActivate {
  constructor(
    @InjectRepository(ManagerLocation)
    private readonly managerLocationRepository: Repository<ManagerLocation>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: { location_id?: string };
      body: { location_id?: string };
      query: { location_id?: string };
      user: User;
    }>();
    const locationId =
      request.params?.location_id ??
      request.body?.location_id ??
      request.query?.location_id;
    if (!locationId) {
      return true;
    }
    const user = request.user;
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    if (user.role === UserRole.MANAGER) {
      const assignment = await this.managerLocationRepository.findOne({
        where: { userId: user.id, locationId },
      });
      if (!assignment) {
        throw new ForbiddenException();
      }
      return true;
    }
    if (user.role === UserRole.STAFF) {
      return true;
    }
    return true;
  }
}
