import { axiosInstance } from './axios.instance';
import type {
  UserDetailResponseDto,
  CreateUserDto,
  UpdateUserDto,
} from '../types/user.types';

export async function createUser(
  dto: CreateUserDto
): Promise<{ data: UserDetailResponseDto }> {
  return axiosInstance.post<UserDetailResponseDto>('/users', dto);
}

export async function getUsers(): Promise<{
  data: UserDetailResponseDto[];
}> {
  return axiosInstance.get<UserDetailResponseDto[]>('/users');
}

export async function getTestAccounts(): Promise<{
  data: UserDetailResponseDto[];
}> {
  return axiosInstance.get<UserDetailResponseDto[]>('/auth/test-accounts');
}

export async function getUser(
  id: string
): Promise<{ data: UserDetailResponseDto }> {
  return axiosInstance.get<UserDetailResponseDto>(`/users/${id}`);
}

export async function updateUser(
  id: string,
  dto: UpdateUserDto
): Promise<{ data: UserDetailResponseDto }> {
  return axiosInstance.patch<UserDetailResponseDto>(`/users/${id}`, dto);
}

export async function deactivateUser(
  id: string
): Promise<{ data: UserDetailResponseDto }> {
  return axiosInstance.delete<UserDetailResponseDto>(`/users/${id}`);
}
