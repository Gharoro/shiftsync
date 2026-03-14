import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../entities/user.entity';
import { OverTimeService } from './overtime.service';
import {
  StaffOvertimeSummary,
  WeeklyOvertimeDashboard,
} from './types/overtime.types';

@Controller({ path: 'overtime', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OverTimeController {
  constructor(private readonly overTimeService: OverTimeService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getWeeklyDashboard(
    @Query('location_id') locationId: string | undefined,
    @Query('week_start') weekStart: string | undefined,
    @CurrentUser() user: User,
  ): Promise<WeeklyOvertimeDashboard> {
    if (!locationId?.trim()) {
      throw new BadRequestException('location_id is required');
    }
    if (!weekStart?.trim()) {
      throw new BadRequestException('week_start is required');
    }
    return this.overTimeService.getWeeklyDashboard(
      locationId.trim(),
      weekStart.trim(),
      user,
    );
  }

  @Get('staff/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getStaffOvertimeSummary(
    @Param('userId') userId: string,
    @Query('week_start') weekStart: string | undefined,
    @CurrentUser() user: User,
  ): Promise<StaffOvertimeSummary> {
    if (!weekStart?.trim()) {
      throw new BadRequestException('week_start is required');
    }
    return this.overTimeService.getStaffOvertimeSummary(
      userId,
      weekStart.trim(),
      user,
    );
  }
}
