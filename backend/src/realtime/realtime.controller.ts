import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../entities/user.entity';
import { RealtimeService } from './realtime.service';
import { OnDutyEntryDto } from './types/on-duty.types';

@Controller({ path: 'realtime', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Get('on-duty')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getOnDuty(
    @Query('location_id') locationId: string | undefined,
    @CurrentUser() user: User,
  ): Promise<OnDutyEntryDto[]> {
    if (!locationId?.trim()) {
      throw new BadRequestException('location_id is required');
    }
    return this.realtimeService.getOnDuty(locationId.trim(), user);
  }
}
