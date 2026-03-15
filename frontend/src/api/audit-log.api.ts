import { axiosInstance } from './axios.instance';
import type { AuditLogResponseDto } from '../types/audit-log.types';

export async function getAuditLogs(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<{ data: AuditLogResponseDto[] }> {
  return axiosInstance.get<AuditLogResponseDto[]>('/audit-log', {
    params: { location_id: locationId, start_date: startDate, end_date: endDate },
  });
}

export async function getShiftAuditLog(
  shiftId: string
): Promise<{ data: AuditLogResponseDto[] }> {
  return axiosInstance.get<AuditLogResponseDto[]>(
    `/audit-log/shift/${shiftId}`
  );
}

export async function exportLogs(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<{ data: Blob }> {
  return axiosInstance.get<Blob>('/audit-log/export', {
    params: {
      location_id: locationId,
      start_date: startDate,
      end_date: endDate,
    },
    responseType: 'blob',
  });
}
