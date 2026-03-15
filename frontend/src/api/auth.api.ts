import { axiosInstance } from './axios.instance';
import type { AuthResponseDto, CurrentUser } from '../types/user.types';

export async function login(
  email: string,
  password: string
): Promise<{ data: AuthResponseDto }> {
  return axiosInstance.post<AuthResponseDto>('/auth/login', { email, password });
}

export async function getMe(): Promise<{ data: CurrentUser }> {
  return axiosInstance.get<CurrentUser>('/auth/me');
}
