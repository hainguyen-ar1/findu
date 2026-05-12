import { create } from 'zustand';
import type { ChatMessage } from '@/types/chat.types';

interface ChatState {
  messages: ChatMessage[];
  myAlias: string | null;
  partnerAlias: string | null;
  isPartnerTyping: boolean;
  addMessage: (msg: ChatMessage) => void;
  setAliases: (my: string, partner?: string) => void;
  setPartnerTyping: (typing: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  myAlias: null,
  partnerAlias: null,
  isPartnerTyping: false,

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  setAliases: (my, partner) =>
    set({ myAlias: my, partnerAlias: partner ?? null }),

  setPartnerTyping: (typing) => set({ isPartnerTyping: typing }),

  clearChat: () =>
    set({ messages: [], myAlias: null, partnerAlias: null, isPartnerTyping: false }),
}));
