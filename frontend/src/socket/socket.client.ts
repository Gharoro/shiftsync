import { io, type Socket } from 'socket.io-client';
import { env } from '../config/env';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }
  socket = io(env.SOCKET_URL, {
    auth: { token },
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
