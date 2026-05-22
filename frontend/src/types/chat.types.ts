export type MessageType = 'text' | 'image' | 'system';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'personal_info'
  | 'other';

export interface ChatMessage {
  id?: string;
  senderAlias: string;
  type: MessageType;
  content?: string;
  imageUrl?: string;
  createdAt?: string;
}

export interface RoomSession {
  roomId: string;
  myAlias: string;
  myAvatar: string;
  partnerAlias: string;
  partnerAvatar: string;
  partnerOnline: boolean;
  partnerUserId?: string | null;
  isAnonymous: true;
}
