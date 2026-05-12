'use client';

import { useEffect, useCallback } from 'react';
import { getChatSocket } from '@/lib/socket';
import { useChatStore } from '@/store/chatStore';
import type { ChatMessage } from '@/types/chat.types';

export function useChat(roomId: string) {
  const { messages, myAlias, partnerAlias, isPartnerTyping, addMessage, setAliases, setPartnerTyping, clearChat } =
    useChatStore();

  useEffect(() => {
    const socket = getChatSocket();
    socket.connect();

    socket.emit('room:join', { roomId });

    socket.on('room:joined', ({ alias }: { alias: string }) => {
      setAliases(alias);
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      addMessage(msg);
    });

    socket.on('chat:typing', ({ isTyping }: { isTyping: boolean }) => {
      setPartnerTyping(isTyping);
    });

    socket.on('chat:partner_left', () => {
      addMessage({ senderAlias: 'System', type: 'system', content: 'Đối phương đã rời phòng.' });
    });

    return () => {
      socket.off('room:joined');
      socket.off('chat:message');
      socket.off('chat:typing');
      socket.off('chat:partner_left');
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (content: string, type: 'text' | 'image' = 'text') => {
      const socket = getChatSocket();
      socket.emit('chat:send', { roomId, type, content });
    },
    [roomId],
  );

  const leaveRoom = useCallback(() => {
    const socket = getChatSocket();
    socket.emit('room:leave', { roomId });
    socket.disconnect();
    clearChat();
  }, [roomId]);

  return { messages, isPartnerTyping, myAlias, partnerAlias, sendMessage, leaveRoom };
}
