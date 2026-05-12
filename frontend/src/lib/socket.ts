import { io, Socket } from 'socket.io-client';

let chatSocket: Socket | null = null;
let matchmakingSocket: Socket | null = null;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

function getToken(): string {
  return typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '';
}

export function getChatSocket(): Socket {
  if (!chatSocket) {
    chatSocket = io(`${SOCKET_URL}/chat`, {
      auth: { token: getToken() },
      autoConnect: false,
    });
  }
  return chatSocket;
}

export function getMatchmakingSocket(): Socket {
  if (!matchmakingSocket) {
    matchmakingSocket = io(`${SOCKET_URL}/matchmaking`, {
      auth: { token: getToken() },
      autoConnect: false,
    });
  }
  return matchmakingSocket;
}

export function disconnectAll() {
  chatSocket?.disconnect();
  matchmakingSocket?.disconnect();
  chatSocket = null;
  matchmakingSocket = null;
}
