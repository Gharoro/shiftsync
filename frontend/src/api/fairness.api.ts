import { axiosInstance } from './axios.instance';
import type {
  HoursDistributionEntry,
  FairnessReport,
} from '../types/fairness.types';

export async function getHoursDistribution(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<{ data: HoursDistributionEntry[] }> {
  return axiosInstance.get<HoursDistributionEntry[]>('/fairness/hours', {
    params: {
      location_id: locationId,
      start_date: startDate,
      end_date: endDate,
    },
  });
}

export async function getFairnessReport(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<{ data: FairnessReport }> {
  return axiosInstance.get<FairnessReport>('/fairness/report', {
    params: {
      location_id: locationId,
      start_date: startDate,
      end_date: endDate,
    },
  });
}
