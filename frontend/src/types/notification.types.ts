export interface NotificationResponseDto {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}
