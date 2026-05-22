/** Cookie lưu roomId hiện tại để middleware có thể đọc (SSR-safe). */
const ROOM_COOKIE = 'active-room-id';

/** Thời gian tồn tại của cookie phòng chat: 24 giờ. */
const ROOM_COOKIE_MAX_AGE = 60 * 60 * 24;

/** Ghi roomId vào cookie khi user join phòng thành công. */
export function setRoomCookie(roomId: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${ROOM_COOKIE}=${roomId}; path=/; max-age=${ROOM_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Xóa cookie phòng chat khi user rời phòng hoặc phòng đóng. */
export function clearRoomCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${ROOM_COOKIE}=; path=/; max-age=0`;
}
