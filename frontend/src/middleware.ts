import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Routes không cần xác thực */
const PUBLIC_ROUTES = ['/', '/login', '/register', '/verify-email', '/auth/callback'];

/** Routes chỉ dành cho guest (chưa đăng nhập) */
const GUEST_ONLY_ROUTES = ['/login', '/register', '/verify-email'];

/**
 * Routes mà user đang trong phòng chat KHÔNG được phép vào.
 * Khi truy cập, sẽ bị redirect về phòng chat đang hoạt động.
 */
const BLOCKED_WHEN_IN_ROOM = ['/', '/matchmaking'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Đọc accessToken từ cookie (SSR-safe)
  const authCookie = request.cookies.get('auth-token');

  // Cookie chứa roomId hiện tại — được set bởi useChat khi server xác nhận room:joined.
  const activeRoomCookie = request.cookies.get('active-room-id');
  const activeRoomId = activeRoomCookie?.value ?? null;

  const isPublic = PUBLIC_ROUTES.some(
    (route) => route === '/' ? pathname === '/' : pathname.startsWith(route),
  );
  const isGuestOnly = GUEST_ONLY_ROUTES.some((route) => pathname.startsWith(route));
  const isBlockedWhenInRoom = BLOCKED_WHEN_IN_ROOM.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );

  // Nếu đã đăng nhập và vào trang guest-only → redirect về matchmaking
  if (authCookie && isGuestOnly) {
    return NextResponse.redirect(new URL('/matchmaking', request.url));
  }

  // Nếu chưa đăng nhập và vào route protected → redirect về login
  if (!authCookie && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Nếu đang trong một phòng chat và cố vào trang bị chặn → redirect về phòng cũ.
  // Điều này ngăn user ghép đôi mới trong khi vẫn còn session cũ.
  if (authCookie && activeRoomId && isBlockedWhenInRoom) {
    return NextResponse.redirect(new URL(`/chat/${activeRoomId}`, request.url));
  }

  // Bảo vệ /chat/[roomId]: nếu user đã có phòng khác thì chặn vào phòng lạ.
  // Khi chưa có cookie (vừa ghép đôi) → cho phép, backend WebSocket sẽ xác minh quyền.
  const chatMatch = pathname.match(/^\/chat\/([^/]+)$/);
  if (authCookie && chatMatch) {
    const requestedRoomId = chatMatch[1];

    // User có phòng đang hoạt động nhưng cố vào phòng khác → redirect về phòng của mình.
    if (activeRoomId && activeRoomId !== requestedRoomId) {
      return NextResponse.redirect(new URL(`/chat/${activeRoomId}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Áp dụng middleware cho tất cả routes trừ static files và API
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};

