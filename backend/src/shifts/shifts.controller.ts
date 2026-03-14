import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LocationGuard } from '../common/guards/location.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../entities/user.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { PublishWeekDto } from './dto/publish-week.dto';
import { ShiftResponseDto } from './dto/shift-response.dto';
import { ShiftsService } from './shifts.service';

@Controller({ path: 'shifts', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard, LocationGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(
    @Body() dto: CreateShiftDto,
    @CurrentUser() user: User,
  ): Promise<ShiftResponseDto> {
    return this.shiftsService.createShift(dto, user);
  }

  @Post('publish-week')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  publishWeek(
    @Body() dto: PublishWeekDto,
    @CurrentUser() user: User,
  ): Promise<{ count: number }> {
    return this.shiftsService.publishWeek(dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findByLocationAndDateRange(
    @Query('location_id') locationId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @CurrentUser() user: User,
  ): Promise<ShiftResponseDto[]> {
    return this.shiftsService.findByLocationAndDateRange(
      locationId,
      startDate,
      endDate,
      user,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ShiftResponseDto> {
    return this.shiftsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
    @CurrentUser() user: User,
  ): Promise<ShiftResponseDto> {
    return this.shiftsService.updateShift(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  delete(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ShiftResponseDto> {
    return this.shiftsService.deleteShift(id, user);
  }

  @Patch(':id/unpublish')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  unpublish(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ShiftResponseDto> {
    return this.shiftsService.unpublishShift(id, user);
  }
}
