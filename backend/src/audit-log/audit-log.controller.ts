import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditLogService } from './audit-log.service';

@Controller({ path: 'audit-log', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('shift/:shiftId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findByShift(
    @Param('shiftId') shiftId: string,
    @CurrentUser() user: User,
  ): Promise<AuditLog[]> {
    return this.auditLogService.findByShift(shiftId, user);
  }

  @Get('export')
  @Roles(UserRole.ADMIN)
  async exportLogs(
    @Query('location_id') locationId: string | undefined,
    @Query('start_date') startDate: string | undefined,
    @Query('end_date') endDate: string | undefined,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    if (!locationId?.trim()) {
      throw new BadRequestException('location_id is required');
    }
    if (!startDate?.trim()) {
      throw new BadRequestException('start_date is required');
    }
    if (!endDate?.trim()) {
      throw new BadRequestException('end_date is required');
    }
    const csv = await this.auditLogService.exportLogs(
      locationId.trim(),
      startDate.trim(),
      endDate.trim(),
      user,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    res.send(csv);
  }
}
