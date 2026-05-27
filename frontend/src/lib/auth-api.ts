import { apiClient } from '@/lib/api';
import type { AuthResponse } from '@/types/api.types';

export const authApi = {
  register: (data: { email: string; password: string; displayName: string; gender: string }) =>
    apiClient.post<any, AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<any, AuthResponse>('/auth/login', data),

  verifyEmail: (data: { email: string; otp: string }) =>
    apiClient.post<any, AuthResponse>('/auth/verify-email', data),

  resendOtp: (email: string) =>
    apiClient.post<any, { message: string }>('/auth/resend-otp', { email }),

  refresh: (refreshToken: string) =>
    apiClient.post<any, AuthResponse>('/auth/refresh', { refreshToken }),

  me: () => apiClient.get<any, AuthResponse['user']>('/auth/me'),
};
