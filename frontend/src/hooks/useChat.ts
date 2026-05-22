'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getChatSocket } from '@/lib/socket';
import { useChatStore } from '@/store/chatStore';
import { chatApi } from '@/lib/chat-api';
import { setRoomCookie, clearRoomCookie } from '@/lib/room-cookie';
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
  const router = useRouter();

  useEffect(() => {
    const socket = getChatSocket();
    const token = localStorage.getItem('accessToken') || '';
    socket.auth = { token };

    const connectAndJoin = () => {
      socket.emit('room:join', { roomId });
    };

    const onRoomJoined = (data: { session: RoomSession; partnerUserId: string | null; messages: ChatMessage[] }) => {
      setSession(data.session, data.partnerUserId);
      setMessages(data.messages);
      setError(null);
      // Lưu roomId vào cookie để middleware có thể redirect user về phòng cũ.
      setRoomCookie(roomId);
    };

    const onMessage = (msg: ChatMessage) => {
      addMessage(msg);
    };

    const onTypingEvent = ({ isTyping }: { isTyping: boolean }) => {
      setPartnerTyping(isTyping);
    };

    const onPresence = ({ online }: { userId: string; online: boolean }) => {
      setPartnerOnline(online);
    };

    const onRoomClosed = () => {
      // Xóa cookie phòng khi phòng bị đóng từ phía server.
      clearRoomCookie();
      addMessage({
        senderAlias: 'System',
        type: 'system',
        content: 'Phòng đã đóng. Tin nhắn không được lưu.',
      });
    };

    const onSocketError = (data: { message?: string }) => {
      setError(data?.message || 'Có lỗi xảy ra');
    };

    /**
     * Server tu choi quyen vao phong:
     * - Neu user dang co phong khac (doc tu cookie) -> redirect ve phong do.
     * - Neu khong co phong nao -> ve trang chu.
     */
    const onAccessDenied = () => {
      socket.disconnect();
      // Xóa cookie stale để tránh middleware redirect vòng lặp vào phòng chết.
      clearRoomCookie();
      router.replace('/');
    };

    // Đăng ký listeners TRƯỚC khi connect/join để tránh miss event do race.
    socket.on('connect', connectAndJoin);
    socket.on('room:joined', onRoomJoined);
    socket.on('room:access_denied', onAccessDenied);
    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTypingEvent);
    socket.on('room:presence', onPresence);
    socket.on('room:closed', onRoomClosed);
    socket.on('error', onSocketError);

    if (!socket.connected) {
      socket.connect();
    } else {
      connectAndJoin();
    }

    return () => {
      socket.off('connect', connectAndJoin);
      socket.off('room:joined', onRoomJoined);
      socket.off('room:access_denied', onAccessDenied);
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTypingEvent);
      socket.off('room:presence', onPresence);
      socket.off('room:closed', onRoomClosed);
      socket.off('error', onSocketError);
    };
  }, [roomId, router, setSession, setMessages, addMessage, setPartnerTyping, setPartnerOnline, setError]);

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
    // Xóa cookie phòng khi user chủ động rời phòng.
    clearRoomCookie();
    clearChat();
  }, [roomId, clearChat]);

  const blockPartner = useCallback(() => {
    if (!partnerUserId) return;
    const socket = getChatSocket();
    socket.emit('room:block', { roomId, targetUserId: partnerUserId });
    // Xóa cookie phòng để user có thể tìm người tâm sự mới sau khi block.
    clearRoomCookie();
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
