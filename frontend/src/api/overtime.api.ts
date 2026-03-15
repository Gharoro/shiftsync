import { axiosInstance } from './axios.instance';
import type {
  WeeklyOvertimeDashboard,
  StaffOvertimeSummary,
} from '../types/overtime.types';

export async function getWeeklyDashboard(
  locationId: string,
  weekStart: string
): Promise<{ data: WeeklyOvertimeDashboard }> {
  return axiosInstance.get<WeeklyOvertimeDashboard>('/overtime/dashboard', {
    params: { location_id: locationId, week_start: weekStart },
  });
}

export async function getStaffOvertimeSummary(
  userId: string,
  weekStart: string
): Promise<{ data: StaffOvertimeSummary }> {
  return axiosInstance.get<StaffOvertimeSummary>(
    `/overtime/staff/${userId}`,
    { params: { week_start: weekStart } }
  );
}
