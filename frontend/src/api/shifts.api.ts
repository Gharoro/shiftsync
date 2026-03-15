import { axiosInstance } from './axios.instance';
import type {
  ShiftResponseDto,
  CreateShiftDto,
  UpdateShiftDto,
  PublishWeekDto,
  AssignStaffDto,
  UnassignStaffDto,
  PreviewAssignmentDto,
} from '../types/shift.types';

export async function createShift(
  dto: CreateShiftDto
): Promise<{ data: ShiftResponseDto }> {
  return axiosInstance.post<ShiftResponseDto>('/shifts', dto);
}

export async function updateShift(
  id: string,
  dto: UpdateShiftDto
): Promise<{ data: ShiftResponseDto }> {
  return axiosInstance.patch<ShiftResponseDto>(`/shifts/${id}`, dto);
}

export async function getShifts(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<{ data: ShiftResponseDto[] }> {
  return axiosInstance.get<ShiftResponseDto[]>('/shifts', {
    params: { location_id: locationId, start_date: startDate, end_date: endDate },
  });
}

export async function getShift(
  id: string
): Promise<{ data: ShiftResponseDto }> {
  return axiosInstance.get<ShiftResponseDto>(`/shifts/${id}`);
}

export async function publishWeek(
  dto: PublishWeekDto
): Promise<{ data: { count: number } }> {
  return axiosInstance.post<{ count: number }>('/shifts/publish-week', dto);
}

export async function unpublishShift(
  id: string
): Promise<{ data: ShiftResponseDto }> {
  return axiosInstance.patch<ShiftResponseDto>(`/shifts/${id}/unpublish`);
}

export async function assignStaff(
  shiftId: string,
  dto: AssignStaffDto
): Promise<{ data: ShiftResponseDto }> {
  return axiosInstance.post<ShiftResponseDto>(
    `/shifts/${shiftId}/assign`,
    dto
  );
}

export async function unassignStaff(
  shiftId: string,
  dto: UnassignStaffDto
): Promise<{ data: ShiftResponseDto }> {
  return axiosInstance.post<ShiftResponseDto>(
    `/shifts/${shiftId}/unassign`,
    dto
  );
}

export async function previewAssignment(
  shiftId: string,
  dto: PreviewAssignmentDto
): Promise<{ data: unknown }> {
  return axiosInstance.post<unknown>(
    `/shifts/${shiftId}/preview-assignment`,
    dto
  );
}
