import { axiosInstance } from './axios.instance';
import type { NotificationResponseDto } from '../types/notification.types';

export async function getNotifications(): Promise<{
  data: NotificationResponseDto[];
}> {
  return axiosInstance.get<NotificationResponseDto[]>('/notifications');
}

export async function markAsRead(
  id: string
): Promise<{ data: NotificationResponseDto }> {
  return axiosInstance.patch<NotificationResponseDto>(
    `/notifications/${id}/read`
  );
}

export async function markAllAsRead(): Promise<{
  data: { count: number };
}> {
  return axiosInstance.patch<{ count: number }>(
    '/notifications/read-all'
  );
}

export async function getUnreadCount(): Promise<{ data: number }> {
  return axiosInstance.get<number>('/notifications/unread-count');
}
