export type MessageType = 'text' | 'image' | 'system';

export interface ChatMessage {
  id?: string;
  senderAlias: string;
  type: MessageType;
  content?: string;
  imageUrl?: string;
  createdAt?: string;
}

export interface RoomInfo {
  roomId: string;
  myAlias: string;
  partnerAlias?: string;
}
