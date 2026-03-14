import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import { NotificationsService } from './notifications.service';

@Controller({ path: 'notifications', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: User): Promise<Notification[]> {
    return this.notificationsService.findAll(user);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: User): Promise<number> {
    return this.notificationsService.getUnreadCount(user);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: User): Promise<{ count: number }> {
    return this.notificationsService.markAllAsRead(user);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(id, user);
  }
}
