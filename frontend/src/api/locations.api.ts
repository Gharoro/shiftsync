import { axiosInstance } from './axios.instance';
import type { LocationOption } from '../types/location.types';

export async function getLocations(): Promise<{ data: LocationOption[] }> {
  return axiosInstance.get<LocationOption[]>('/locations');
}
