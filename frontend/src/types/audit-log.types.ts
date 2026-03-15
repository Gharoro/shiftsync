export interface AuditLogResponseDto {
  id: string;
  entityType: string;
  entityId: string;
  locationId: string | null;
  action: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  performedBy: string;
  performedAt: string;
}
