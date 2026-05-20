'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getChatSocket } from '@/lib/socket';
import { useChatStore } from '@/store/chatStore';
import { chatApi } from '@/lib/chat-api';
import type { ChatMessage, RoomSession } from '@/types/chat.types';

export function useChat(roomId: string) {
  const {
    messages,
    session,
    partnerUserId,
    isPartnerTyping,
    partnerOnline,
    error,
    setSession,
    setMessages,
    addMessage,
    setPartnerTyping,
    setPartnerOnline,
    setError,
    clearChat,
  } = useChatStore();

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const socket = getChatSocket();
    const token = localStorage.getItem('accessToken') || '';
    socket.auth = { token };

    const connectAndJoin = () => {
      socket.emit('room:join', { roomId });
    };

    if (!socket.connected) {
      socket.connect();
      socket.once('connect', connectAndJoin);
    } else {
      connectAndJoin();
    }

    socket.on('room:joined', (data: { session: RoomSession; partnerUserId: string | null; messages: ChatMessage[] }) => {
      setSession(data.session, data.partnerUserId);
      setMessages(data.messages);
      setError(null);
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      addMessage(msg);
    });

    socket.on('chat:typing', ({ isTyping }: { isTyping: boolean }) => {
      setPartnerTyping(isTyping);
    });

    socket.on('room:presence', ({ online }: { userId: string; online: boolean }) => {
      setPartnerOnline(online);
    });

    socket.on('room:closed', () => {
      addMessage({
        senderAlias: 'System',
        type: 'system',
        content: 'Phòng đã đóng. Tin nhắn không được lưu.',
      });
    });

    socket.on('error', (data: { message?: string }) => {
      setError(data?.message || 'Có lỗi xảy ra');
    });

    return () => {
      socket.off('connect');
      socket.off('room:joined');
      socket.off('chat:message');
      socket.off('chat:typing');
      socket.off('room:presence');
      socket.off('room:closed');
      socket.off('error');
    };
  }, [roomId, setSession, setMessages, addMessage, setPartnerTyping, setPartnerOnline, setError]);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      const socket = getChatSocket();
      socket.emit('chat:typing', { roomId, isTyping });
    },
    [roomId],
  );

  const onTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitTyping(false);
    }, 2000);
  }, [emitTyping]);

  const sendMessage = useCallback(
    (content: string) => {
      const socket = getChatSocket();
      socket.emit('chat:send', { roomId, type: 'text', content });
      emitTyping(false);
      isTypingRef.current = false;
    },
    [roomId, emitTyping],
  );

  const sendImage = useCallback(
    async (file: File) => {
      setError(null);
      try {
        await chatApi.uploadImage(roomId, file);
        // Tin ảnh được broadcast qua socket `chat:message`
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không gửi được ảnh');
      }
    },
    [roomId, setError],
  );

  const leaveRoom = useCallback(() => {
    const socket = getChatSocket();
    socket.emit('room:leave', { roomId });
    socket.disconnect();
    clearChat();
  }, [roomId, clearChat]);

  const blockPartner = useCallback(() => {
    if (!partnerUserId) return;
    const socket = getChatSocket();
    socket.emit('room:block', { roomId, targetUserId: partnerUserId });
    clearChat();
  }, [roomId, partnerUserId, clearChat]);

  return {
    messages,
    session,
    partnerUserId,
    isPartnerTyping,
    partnerOnline,
    error,
    myAlias: session?.myAlias ?? null,
    partnerAlias: session?.partnerAlias ?? null,
    myAvatar: session?.myAvatar ?? null,
    partnerAvatar: session?.partnerAvatar ?? null,
    sendMessage,
    sendImage,
    leaveRoom,
    blockPartner,
    onTyping,
    setError,
  };
}
