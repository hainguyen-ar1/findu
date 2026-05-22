'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMatchmakingSocket } from '@/lib/socket';
import { matchmakingApi, type QueueStatus, type JoinMatchmakingPayload } from '@/lib/matchmaking-api';

export function useMatchmaking() {
  const [isInQueue, setIsInQueue] = useState(false);
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onMatchRef = useRef<((roomId: string) => void) | null>(null);

  useEffect(() => {
    const socket = getMatchmakingSocket();

    const onJoined = (data: QueueStatus) => {
      setIsInQueue(true);
      setStatus(data);
      setError(null);
    };

    const onPosition = (data: QueueStatus) => {
      setStatus(data);
      setIsInQueue(data.inQueue);
    };

    const onLeft = () => {
      setIsInQueue(false);
      setStatus(null);
    };

    const onTimeout = (data: { message?: string }) => {
      setIsInQueue(false);
      setStatus(null);
      setError(data?.message || 'Hết thời gian chờ (5 phút)');
    };

    const onMatchFound = ({ roomId }: { roomId: string }) => {
      setIsInQueue(false);
      setStatus(null);
      onMatchRef.current?.(roomId);
    };

    const onSocketError = (data: { message?: string }) => {
      setError(data?.message || 'Có lỗi xảy ra');
    };

    socket.on('queue:joined', onJoined);
    socket.on('queue:position', onPosition);
    socket.on('queue:left', onLeft);
    socket.on('queue:timeout', onTimeout);
    socket.on('match:found', onMatchFound);
    socket.on('error', onSocketError);

    return () => {
      socket.off('queue:joined', onJoined);
      socket.off('queue:position', onPosition);
      socket.off('queue:left', onLeft);
      socket.off('queue:timeout', onTimeout);
      socket.off('match:found', onMatchFound);
      socket.off('error', onSocketError);
    };
  }, []);

  const joinQueue = useCallback(
    async (payload: JoinMatchmakingPayload, onMatchFound: (roomId: string) => void) => {
      setError(null);
      onMatchRef.current = onMatchFound;

      try {
        // HTTP: validate + vào Redis queue
        const initialStatus = await matchmakingApi.join(payload);

        const socket = getMatchmakingSocket();
        socket.auth = { token: localStorage.getItem('accessToken') || '' };

        if (!socket.connected) {
          await new Promise<void>((resolve, reject) => {
            socket.once('connect', () => resolve());
            socket.once('connect_error', (err) => reject(err));
            socket.connect();
          });
        }

        // WebSocket: cập nhật socketId + nhận position/match real-time
        socket.emit('queue:sync');

        setIsInQueue(initialStatus.inQueue);
        setStatus(initialStatus);
      } catch (err: any) {
        setError(err.message || 'Không thể vào hàng đợi');
        throw err;
      }
    },
    [],
  );

  const leaveQueue = useCallback(async () => {
    try {
      const socket = getMatchmakingSocket();
      socket.emit('queue:leave');
      await matchmakingApi.leave();
    } catch {
      // vẫn reset UI
    } finally {
      setIsInQueue(false);
      setStatus(null);
    }
  }, []);

  // Cleanup khi unmount trang
  useEffect(() => {
    return () => {
      if (isInQueue) {
        const socket = getMatchmakingSocket();
        socket.emit('queue:leave');
        matchmakingApi.leave().catch(() => {});
      }
    };
  }, [isInQueue]);

  return {
    isInQueue,
    status,
    position: status?.position ?? 0,
    queueSize: status?.queueSize ?? 0,
    waitSeconds: status?.waitSeconds ?? 0,
    expiresInSeconds: status?.expiresInSeconds ?? 0,
    error,
    joinQueue,
    leaveQueue,
  };
}
