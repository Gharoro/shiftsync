import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import type { NotificationCreatedEventPayload } from '../notifications/notifications.service';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(): void {
    this.realtimeService.setServer(this.server);
  }

  async handleConnection(socket: import('socket.io').Socket): Promise<void> {
    const token =
      (socket.handshake.auth?.token as string) ??
      (socket.handshake.headers?.authorization as string);
    if (!token?.trim()) {
      socket.disconnect(true);
      return;
    }
    const raw = token.trim().replace(/^Bearer\s+/i, '');
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(raw);
      const userId = payload?.sub;
      if (!userId) {
        socket.disconnect(true);
        return;
      }
      this.realtimeService.registerSocket(userId, socket.id);
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: import('socket.io').Socket): void {
    this.realtimeService.removeSocket(socket.id);
  }

  @SubscribeMessage('ping')
  handlePing(): 'pong' {
    return 'pong';
  }

  @OnEvent('notification.created')
  handleNotificationCreated(payload: NotificationCreatedEventPayload): void {
    this.realtimeService.emitToUser(payload.userId, 'new_notification', {
      notification: payload.notification,
    });
  }
}
