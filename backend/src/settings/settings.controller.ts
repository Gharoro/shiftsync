import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../entities/user.entity';
import { Settings } from '../entities/settings.entity';
import { SettingsService } from './settings.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';

@Controller({ path: 'settings', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@CurrentUser() user: User): Promise<Settings[]> {
    return this.settingsService.findAll(user);
  }

  @Get('location/:locationId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findByLocation(
    @Param('locationId') locationId: string,
    @CurrentUser() user: User,
  ): Promise<Settings[]> {
    return this.settingsService.findByLocation(locationId, user);
  }

  @Put('location/:locationId')
  @Roles(UserRole.ADMIN)
  upsert(
    @Param('locationId') locationId: string,
    @Body() dto: UpsertSettingDto,
    @CurrentUser() user: User,
  ): Promise<Settings> {
    return this.settingsService.upsert(locationId, dto.key, dto.value, user);
  }
}
