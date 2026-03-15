const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:7070/api/v1';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:7070';

export const env = {
  API_BASE_URL,
  SOCKET_URL,
} as const;
