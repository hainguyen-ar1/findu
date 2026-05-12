'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMatchmakingSocket } from '@/lib/socket';

interface QueueOptions {
  preference?: 'any' | 'opposite' | 'same';
  preferredGender?: string;
}

export function useMatchmaking() {
  const [isInQueue, setIsInQueue] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const socket = getMatchmakingSocket();

    socket.on('queue:joined', ({ position: pos }: { position: number }) => {
      setIsInQueue(true);
      setPosition(pos);
    });

    socket.on('queue:left', () => {
      setIsInQueue(false);
      setPosition(0);
    });

    socket.on('queue:position', ({ position: pos }: { position: number }) => {
      setPosition(pos);
    });

    return () => {
      socket.off('queue:joined');
      socket.off('queue:left');
      socket.off('queue:position');
    };
  }, []);

  const joinQueue = useCallback(
    (options: QueueOptions, onMatchFound: (roomId: string) => void) => {
      const socket = getMatchmakingSocket();
      socket.connect();

      socket.once('match:found', ({ roomId }: { roomId: string }) => {
        setIsInQueue(false);
        onMatchFound(roomId);
      });

      socket.emit('queue:join', options);
    },
    [],
  );

  const leaveQueue = useCallback(() => {
    const socket = getMatchmakingSocket();
    socket.emit('queue:leave');
    setIsInQueue(false);
  }, []);

  return { isInQueue, position, joinQueue, leaveQueue };
}
