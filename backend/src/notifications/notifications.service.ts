import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

export interface NotificationCreatedEventPayload {
  userId: string;
  notification: {
    id: string;
    title: string;
    body: string;
    type: string;
    related_entity_type: string | null;
    related_entity_id: string | null;
    created_at: string;
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createNotification(
    userId: string,
    title: string,
    body: string,
    type: string,
    relatedEntityType: string | null = null,
    relatedEntityId: string | null = null,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.save(
      this.notificationRepository.create({
        userId,
        title,
        body,
        type,
        relatedEntityType,
        relatedEntityId,
      }),
    );
    this.eventEmitter.emit('notification.created', {
      userId,
      notification: {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        related_entity_type: notification.relatedEntityType,
        related_entity_id: notification.relatedEntityId,
        created_at: notification.createdAt.toISOString(),
      },
    } as NotificationCreatedEventPayload);
    return notification;
  }

  async findAll(
    requestingUser: import('../entities/user.entity').User,
  ): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId: requestingUser.id },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(
    notificationId: string,
    requestingUser: import('../entities/user.entity').User,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== requestingUser.id) {
      throw new ForbiddenException();
    }
    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(
    requestingUser: import('../entities/user.entity').User,
  ): Promise<{ count: number }> {
    const result = await this.notificationRepository.update(
      { userId: requestingUser.id, isRead: false },
      { isRead: true },
    );
    return { count: result.affected ?? 0 };
  }

  async getUnreadCount(
    requestingUser: import('../entities/user.entity').User,
  ): Promise<number> {
    return this.notificationRepository.count({
      where: { userId: requestingUser.id, isRead: false },
    });
  }
}
