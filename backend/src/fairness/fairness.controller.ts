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
import { FairnessService } from './fairness.service';
import { FairnessReport, HoursDistributionEntry } from './types/fairness.types';

@Controller({ path: 'fairness', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FairnessController {
  constructor(private readonly fairnessService: FairnessService) {}

  @Get('hours')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getHoursDistribution(
    @Query('location_id') locationId: string | undefined,
    @Query('start_date') startDate: string | undefined,
    @Query('end_date') endDate: string | undefined,
    @CurrentUser() user: User,
  ): Promise<HoursDistributionEntry[]> {
    if (!locationId?.trim()) {
      throw new BadRequestException('location_id is required');
    }
    if (!startDate?.trim()) {
      throw new BadRequestException('start_date is required');
    }
    if (!endDate?.trim()) {
      throw new BadRequestException('end_date is required');
    }
    return this.fairnessService.getHoursDistribution(
      locationId.trim(),
      startDate.trim(),
      endDate.trim(),
      user,
    );
  }

  @Get('report')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getFairnessReport(
    @Query('location_id') locationId: string | undefined,
    @Query('start_date') startDate: string | undefined,
    @Query('end_date') endDate: string | undefined,
    @CurrentUser() user: User,
  ): Promise<FairnessReport> {
    if (!locationId?.trim()) {
      throw new BadRequestException('location_id is required');
    }
    if (!startDate?.trim()) {
      throw new BadRequestException('start_date is required');
    }
    if (!endDate?.trim()) {
      throw new BadRequestException('end_date is required');
    }
    return this.fairnessService.getFairnessReport(
      locationId.trim(),
      startDate.trim(),
      endDate.trim(),
      user,
    );
  }
}
