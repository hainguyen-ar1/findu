import { create } from 'zustand';
import type { ChatMessage, RoomSession } from '@/types/chat.types';

interface ChatState {
  messages: ChatMessage[];
  session: RoomSession | null;
  partnerUserId: string | null;
  isPartnerTyping: boolean;
  partnerOnline: boolean;
  roomClosed: boolean;
  error: string | null;
  setSession: (session: RoomSession, partnerUserId: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;
  setPartnerTyping: (typing: boolean) => void;
  setPartnerOnline: (online: boolean) => void;
  setRoomClosed: (closed: boolean) => void;
  setError: (error: string | null) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  session: null,
  partnerUserId: null,
  isPartnerTyping: false,
  partnerOnline: false,
  roomClosed: false,
  error: null,

  setSession: (session, partnerUserId) =>
    set({ session, partnerUserId, partnerOnline: session.partnerOnline }),

  setMessages: (messages) => set({ messages }),

  addMessage: (msg) =>
    set((state) => {
      if (msg.id && state.messages.some((m) => m.id === msg.id)) return state;
      return { messages: [...state.messages, msg] };
    }),

  setPartnerTyping: (typing) => set({ isPartnerTyping: typing }),

  setPartnerOnline: (online) =>
    set((state) => ({
      partnerOnline: online,
      session: state.session ? { ...state.session, partnerOnline: online } : null,
    })),

  setRoomClosed: (closed) => set({ roomClosed: closed }),

  setError: (error) => set({ error }),

  clearChat: () =>
    set({
      messages: [],
      session: null,
      partnerUserId: null,
      isPartnerTyping: false,
      partnerOnline: false,
      roomClosed: false,
      error: null,
    }),
}));
