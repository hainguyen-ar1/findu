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
  } else {
    chatSocket.auth = { token: getToken() };
  }
  return chatSocket;
}

export function getMatchmakingSocket(): Socket {
  if (!matchmakingSocket) {
    matchmakingSocket = io(`${SOCKET_URL}/matchmaking`, {
      auth: { token: getToken() },
      autoConnect: false,
    });
  } else {
    matchmakingSocket.auth = { token: getToken() };
  }
  return matchmakingSocket;
}

export function disconnectMatchmakingSocket() {
  matchmakingSocket?.disconnect();
  matchmakingSocket = null;
}

export function disconnectAll() {
  chatSocket?.disconnect();
  disconnectMatchmakingSocket();
  chatSocket = null;
}
