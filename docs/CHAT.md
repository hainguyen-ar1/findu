# Room & Chat Module

## Tổng quan

Module phòng chat 1:1 ẩn danh với real-time qua Socket.IO namespace `/chat`, moderation trước khi hiển thị, và chính sách **không lưu lịch sử lâu dài** (xóa tin khi đóng phòng).

## Luồng người dùng

1. Matchmaking ghép đôi → `RoomService.createRoom` tạo `roomId`, nickname + avatar DiceBear cho mỗi người.
2. Frontend chuyển tới `/chat/[roomId]`, kết nối socket `/chat` (JWT bắt buộc).
3. `room:join` → nhận session, lịch sử tạm trong phòng (nếu reconnect), trạng thái online đối phương.
4. Chat text qua `chat:send` (moderation + anti-spam).
5. Ảnh qua `POST /api/chat/:roomId/image` → lưu tạm, broadcast `chat:message`.
6. Report qua `POST /api/moderation/report`, Block qua socket `room:block` hoặc blocklist.
7. **Chủ động** rời phòng hoặc chặn → đóng phòng, xóa messages MongoDB.

## API REST

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/rooms/:roomId` | Session ẩn danh + `partnerUserId` (cho report/block) |
| POST | `/api/chat/:roomId/image` | Upload ảnh (multipart `image`) |
| POST | `/api/moderation/report` | Báo cáo user (rate limit 5/phút) |

## Socket events (`/chat`)

**Client → Server**

| Event | Payload |
|-------|---------|
| `room:join` | `{ roomId }` |
| `chat:send` | `{ roomId, type: 'text', content }` |
| `chat:typing` | `{ roomId, isTyping }` |
| `room:leave` | `{ roomId }` |
| `room:block` | `{ roomId, targetUserId }` |

**Server → Client**

| Event | Mô tả |
|-------|--------|
| `room:joined` | `{ session, partnerUserId, messages }` |
| `chat:message` | Tin nhắn mới hoặc system |
| `chat:typing` | `{ isTyping }` |
| `room:presence` | `{ userId, online }` |
| `room:closed` | Phòng đã đóng (chỉ khi rời phòng / chặn) |
| `error` | `{ message }` |

## Moderation

- **Từ cấm**, regex SĐT VN, email, link, Zalo/Facebook/Telegram.
- **Anti-spam**: tối đa 20 tin/phút, khoảng cách tối thiểu 600ms, chống trùng lặp 5s.
- **Ảnh**: chỉ JPEG/PNG/WebP/GIF, max `MAX_FILE_SIZE_MB` (mặc định 5MB).

## Disconnect & Reconnect

- **Mất kết nối (tab đóng, mạng yếu…)** ≠ rời phòng: phòng vẫn `active`, tin nhắn tạm vẫn còn.
- Đối phương chỉ thấy trạng thái **ngoại tuyến** qua `room:presence`.
- Vào lại `/chat/[roomId]` + `room:join` → khôi phục session, lịch sử tạm trong phòng, tiếp tục chat.
- Phòng **chỉ đóng** khi một người gọi `room:leave` (chủ động rời) hoặc `room:block`.

## Bảo mật

- JWT bắt buộc trên namespace `/chat`.
- Chỉ participant mới join được phòng.
- `partnerUserId` chỉ dùng cho report/block — không hiển thị trên UI.
- Block hai chiều qua `BlocklistService` (ảnh hưởng matchmaking sau này).

## Frontend

- `ChatRoom`, `MessageInput`, `ReportDialog`, hook `useChat`.
- `chat-api.ts`: upload ảnh, report.
- UI mobile-first (`100dvh`, safe area classes).
