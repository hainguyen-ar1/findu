import { apiClient } from './api';
import type { Gender, ChatPreference } from '@/lib/profile-api';

export interface JoinMatchmakingPayload {
  preference: ChatPreference;
  preferredGender?: Gender;
}

export interface QueueStatus {
  inQueue: boolean;
  position: number;
  queueSize: number;
  waitSeconds: number;
  expiresInSeconds: number;
  preference: string;
  preferredGender?: string;
  timedOut: boolean;
}

export const matchmakingApi = {
  join: (data: JoinMatchmakingPayload) =>
    apiClient.post<any, QueueStatus>('/matchmaking/join', data),

  leave: () => apiClient.delete<any, { message: string }>('/matchmaking/leave'),

  status: () => apiClient.get<any, QueueStatus>('/matchmaking/status'),
};
