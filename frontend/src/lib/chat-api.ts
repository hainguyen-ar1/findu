import { apiClient } from './api';
import type { ChatMessage } from '@/types/chat.types';
import type { ReportReason } from '@/types/chat.types';

export interface RoomSession {
  roomId: string;
  myAlias: string;
  myAvatar: string;
  partnerAlias: string;
  partnerAvatar: string;
  partnerOnline: boolean;
  partnerUserId: string | null;
  isAnonymous: true;
}

export const chatApi = {
  getRoom(roomId: string): Promise<RoomSession> {
    return apiClient.get(`/rooms/${roomId}`);
  },

  uploadImage(roomId: string, file: File): Promise<{ message: ChatMessage }> {
    const form = new FormData();
    form.append('image', file);
    return apiClient.post(`/chat/${roomId}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  report(payload: {
    reportedUserId: string;
    roomId: string;
    reason: ReportReason;
    description?: string;
  }) {
    return apiClient.post('/moderation/report', payload);
  },
};
