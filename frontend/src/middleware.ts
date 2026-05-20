import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Routes không cần xác thực */
const PUBLIC_ROUTES = ['/', '/login', '/register', '/verify-email', '/auth/callback'];

/** Routes chỉ dành cho guest (chưa đăng nhập) */
const GUEST_ONLY_ROUTES = ['/login', '/register', '/verify-email'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Đọc accessToken từ cookie (SSR-safe) hoặc dùng Zustand persist key
  // Vì Zustand lưu ở localStorage (client-only), middleware dùng cookie làm signal
  const authCookie = request.cookies.get('auth-token');

  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isGuestOnly = GUEST_ONLY_ROUTES.some((route) => pathname.startsWith(route));

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

  return NextResponse.next();
}

export const config = {
  // Áp dụng middleware cho tất cả routes trừ static files và API
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
