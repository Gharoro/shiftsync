import { axiosInstance } from './axios.instance';
import type { SettingsResponseDto } from '../types/settings.types';

export async function getAllSettings(): Promise<{
  data: SettingsResponseDto[];
}> {
  return axiosInstance.get<SettingsResponseDto[]>('/settings');
}

export async function getLocationSettings(
  locationId: string
): Promise<{ data: SettingsResponseDto[] }> {
  return axiosInstance.get<SettingsResponseDto[]>(
    `/settings/location/${locationId}`
  );
}

export async function upsertSetting(
  locationId: string,
  key: string,
  value: string
): Promise<{ data: SettingsResponseDto }> {
  return axiosInstance.put<SettingsResponseDto>(
    `/settings/location/${locationId}`,
    { key, value }
  );
}

export async function updateSetting(
  id: string,
  value: string
): Promise<{ data: SettingsResponseDto }> {
  return axiosInstance.patch<SettingsResponseDto>(`/settings/${id}`, {
    value,
  });
}
