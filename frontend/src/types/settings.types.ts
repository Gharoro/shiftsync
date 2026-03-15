export interface SettingsResponseDto {
  id: string;
  locationId: string | null;
  key: string;
  value: string;
  updatedBy: string;
  updatedAt: string;
}
