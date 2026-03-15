import { axiosInstance } from './axios.instance';
import type {
  SwapRequestResponseDto,
  CreateSwapRequestDto,
  RespondSwapRequestDto,
  ManagerDecisionDto,
  ClaimDropDto,
} from '../types/swap-request.types';

export async function createSwapRequest(
  dto: CreateSwapRequestDto
): Promise<{ data: SwapRequestResponseDto }> {
  return axiosInstance.post<SwapRequestResponseDto>('/swap-requests', dto);
}

export async function respondToSwap(
  id: string,
  dto: RespondSwapRequestDto
): Promise<{ data: SwapRequestResponseDto }> {
  return axiosInstance.post<SwapRequestResponseDto>(
    `/swap-requests/${id}/respond`,
    dto
  );
}

export async function claimDrop(
  dto: ClaimDropDto
): Promise<{ data: SwapRequestResponseDto }> {
  return axiosInstance.post<SwapRequestResponseDto>(
    '/swap-requests/claim',
    dto
  );
}

export async function managerDecision(
  id: string,
  dto: ManagerDecisionDto
): Promise<{ data: SwapRequestResponseDto }> {
  return axiosInstance.post<SwapRequestResponseDto>(
    `/swap-requests/${id}/decision`,
    dto
  );
}

export async function cancelSwapRequest(
  id: string
): Promise<{ data: SwapRequestResponseDto }> {
  return axiosInstance.delete<SwapRequestResponseDto>(
    `/swap-requests/${id}`
  );
}

export async function getPendingRequests(): Promise<{
  data: SwapRequestResponseDto[];
}> {
  return axiosInstance.get<SwapRequestResponseDto[]>(
    '/swap-requests/pending'
  );
}

export async function getAvailableDrops(): Promise<{
  data: SwapRequestResponseDto[];
}> {
  return axiosInstance.get<SwapRequestResponseDto[]>(
    '/swap-requests/drops'
  );
}
