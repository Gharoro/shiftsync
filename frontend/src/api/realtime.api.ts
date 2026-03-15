import { axiosInstance } from './axios.instance';
import type { OnDutyEntryDto } from '../types/realtime.types';

export async function getOnDuty(
  locationId: string
): Promise<{ data: OnDutyEntryDto[] }> {
  return axiosInstance.get<OnDutyEntryDto[]>('/realtime/on-duty', {
    params: { location_id: locationId },
  });
}
