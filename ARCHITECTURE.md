# StrangerConfide — Tài liệu Kiến trúc & Kỹ thuật

> Tài liệu này dành cho người mới tham gia dự án. Đọc từ trên xuống để nắm toàn bộ bức tranh trước khi đọc code.

---

## 1. Tổng quan dự án

**StrangerConfide** là ứng dụng chat ẩn danh 1-1 thời gian thực. Hai người dùng ngẫu nhiên được ghép đôi, trò chuyện dưới nickname tạm thời, và toàn bộ lịch sử chat bị xóa ngay khi một trong hai rời phòng.

### Triết lý thiết kế

| Nguyên tắc | Cách thực hiện |
|---|---|
| **Privacy first** | Không lưu lịch sử, nickname ngẫu nhiên, không lộ profile thật |
| **Safety first** | Moderation mọi tin nhắn, rate-limit mọi API, blocklist tức thì |
| **Real-time UX** | Socket.IO thay REST cho chat & matchmaking |
| **Modular** | Mỗi domain là một NestJS module độc lập |

---

## 2. Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                   │
│         Next.js 15 · TypeScript · Tailwind · shadcn/ui  │
│         Zustand (state) · Socket.IO-client · Axios      │
└──────────────────────────┬──────────────────────────────┘
                           │  HTTP (REST)  +  WebSocket
┌──────────────────────────▼──────────────────────────────┐
│                   BACKEND (NestJS)                      │
│         TypeScript · Modular Architecture               │
│         Passport JWT · Helmet · ThrottlerGuard          │
│         Socket.IO (namespace /chat, /matchmaking)       │
└───────┬───────────────────────────────────┬─────────────┘
        │                                   │
┌───────▼──────┐                   ┌────────▼───────┐
│   MongoDB    │                   │     Redis      │
│  (Mongoose)  │                   │  Queue + Cache │
│  Persistent  │                   │  Volatile data │
└──────────────┘                   └────────────────┘
```

### Lý do chọn từng công nghệ

| Công nghệ | Lý do |
|---|---|
| **NestJS** | DI container, decorators, module system → dễ tách domain |
| **MongoDB** | Schema linh hoạt cho User/Profile/Room; không cần JOIN phức tạp |
| **Redis** | Matchmaking queue cần tốc độ microsecond; TTL tự động expire |
| **Socket.IO** | Namespace, room, auto-reconnect có sẵn; dễ scale với Redis adapter |
| **Next.js 15 App Router** | Server Component + streaming; layout nested cho auth/main |
| **Zustand** | State management nhẹ, không boilerplate như Redux |

---

## 3. Kiến trúc Backend — Modular DDD

```
src/
├── main.ts                   ← Bootstrap: Helmet, CORS, Pipe, Filter, Interceptor
├── app.module.ts             ← Root module, import tất cả feature modules
├── config/                   ← registerAs config (database, redis, jwt)
├── common/                   ← Shared, không thuộc domain nào
│   ├── filters/              ← HttpExceptionFilter → chuẩn hoá lỗi trả về
│   ├── interceptors/         ← TransformInterceptor → wrap response { success, data }
│   ├── guards/               ← JwtAuthGuard, CustomThrottlerGuard
│   ├── decorators/           ← @CurrentUser(), @Public()
│   ├── exceptions/           ← Typed exceptions (UserNotFoundException, ...)
│   └── utils/                ← hashPassword, generateAnonymousNickname
└── modules/
    ├── auth/                 ← Đăng ký, đăng nhập, OAuth, refresh token
    ├── user/                 ← CRUD user cơ bản (repository pattern)
    ├── profile/              ← Giới tính, tuổi, bio, preference
    ├── matchmaking/          ← Redis queue + ghép đôi logic
    ├── room/                 ← Tạo/đóng phòng, lưu nickname ẩn danh
    ├── chat/                 ← Lưu tin nhắn tạm, Socket gateway
    ├── moderation/           ← Lọc nội dung (text + image)
    ├── blocklist/            ← Block/unblock user
    └── gateway/              ← MainGateway: JWT auth cho mọi socket
```

### Quy tắc trong mỗi module

Mỗi module nên có đầy đủ 5 lớp:

```
module.ts        ← Khai báo imports/providers/exports
controller.ts    ← Nhận HTTP request, gọi service, trả response
service.ts       ← Business logic thuần, không biết HTTP hay DB
repository.ts    ← Chỉ biết MongoDB, không biết business logic
dto/             ← Validate input với class-validator
entities/        ← Mongoose Schema (@Schema, @Prop)
```

> **Tại sao tách Repository?** → Service không phụ thuộc Mongoose trực tiếp → dễ mock khi test, dễ đổi DB sau này.

---

## 4. Luồng dữ liệu chính (User Flow)

### 4.1 Authentication Flow

```
[Client] POST /api/auth/register
    → ValidationPipe kiểm tra RegisterDto
    → AuthService.register()
        → UserService.findByEmail() — kiểm tra trùng email
        → hashPassword() — bcrypt 12 rounds
        → UserService.create()
        → generateTokens() → { accessToken (7d), refreshToken (30d) }
    ← { success: true, data: { accessToken, refreshToken, user } }

[Client] lưu accessToken vào localStorage
[Client] gửi mọi request với header: Authorization: Bearer <token>
[Backend] JwtStrategy.validate() → gắn user vào request.user
[Controller] @CurrentUser() decorator trích user từ request
```

**OAuth (Google/Facebook):**
```
[Client] GET /api/auth/google
    → Redirect tới Google consent screen
    → Google callback → GoogleStrategy.validate()
        → Tạo user nếu chưa có (isEmailVerified = true)
        → generateTokens()
    ← Redirect về frontend kèm tokens
```

**Token Refresh:**
```
accessToken hết hạn (7 ngày)
[Client] POST /api/auth/refresh { refreshToken }
    → JwtService.verify() với JWT_REFRESH_SECRET
    → generateTokens() mới
    ← { accessToken mới, refreshToken mới }
```

---

### 4.2 Matchmaking Flow

> Chi tiết đầy đủ: [docs/MATCHMAKING.md](docs/MATCHMAKING.md)

```
[Client] POST /api/matchmaking/join { preference, preferredGender? }
    → Kiểm tra Profile (gender + age bắt buộc)
    → Redis ZADD matchmaking:queue (score = joinedAt)  ← FIFO
    → Redis SETEX matchmaking:entry:{userId}

[Client] WebSocket /matchmaking + emit queue:sync
    → Cập nhật socketId thật
    → Position loop mỗi 3s → emit queue:position

tryAtomicMatch(userId):
    → Lock userId + lock cặp (chống race)
    → ZRANGE từ người chờ lâu nhất
    → Lọc: block hai chiều, preference compatible
    → claimPair → MULTI xóa cả hai khỏi queue
    → RoomService.createRoom([A, B])
    → emit match:found { roomId, partnerId }

Disconnect / queue:leave / timeout 5 phút → cleanup Redis
```

**Redis keys:**
```
matchmaking:queue              ZSET   FIFO (score = joinedAt)
matchmaking:entry:{userId}     STRING TTL 5 phút
matchmaking:pending:{userId}   STRING Kết quả match chờ socket
```

---

### 4.3 Chat Room Flow

```
[Client] kết nối WebSocket tới /chat
    → JWT auth (giống trên)

[Client] emit "room:join" { roomId }
    → ChatGateway.handleJoinRoom()
        → RoomService.getRoom() — kiểm tra phòng tồn tại, user là participant
        → socket.join(roomId)  ← Socket.IO room
        → socketRoomMap.set(socketId, roomId)  ← để xử lý disconnect
        → emit "room:joined" { alias: "Stranger#7482" }

[Client] emit "chat:send" { roomId, type: "text", content: "Hello" }
    → ChatGateway.handleSendMessage()
        → ModerationService.checkText()  ← lọc SĐT/link/từ cấm
        → ChatService.saveMessage()  ← lưu MongoDB tạm thời
        → server.to(roomId).emit("chat:message", {...})  ← broadcast cả phòng

[Client] disconnect (mất mạng, đóng tab…) — KHÔNG đóng phòng
    → room:presence { online: false }
    → Phòng vẫn active, tin nhắn tạm giữ nguyên
    → Vào lại room:join → khôi phục lịch sử + presence online

[Client] emit "room:leave" (chủ động rời) HOẶC "room:block"
    → closeRoom():
        → RoomService.closeRoom()  ← status = "closed"
        → ChatService.deleteRoomMessages()  ← XÓA TOÀN BỘ tin nhắn
        → emit "room:closed"
```

---

### 4.4 Room Access Control (Single Session)

> Mỗi user tại một thời điểm chỉ được ở trong **một phòng chat duy nhất**.
> Không ai có thể vào phòng người khác bằng cách nhập trực tiếp URL.

**Cơ chế:** Cookie `active-room-id` lưu `roomId` hiện tại, đọc được từ cả client (JavaScript) lẫn server (Next.js middleware).

```
lib/room-cookie.ts
  ├── setRoomCookie(roomId)   ← ghi khi room:joined thành công
  └── clearRoomCookie()       ← xóa khi leave / block / room:closed / access_denied
```

**3 lớp bảo vệ:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Lớp 1: Next.js Middleware (SSR — nhanh nhất, chặn trước khi   │
│         trang load)                                            │
│                                                                │
│  Có cookie + vào / hoặc /matchmaking    → redirect /chat/{id}  │
│  Có cookie A + vào /chat/B (A ≠ B)      → redirect /chat/A     │
│  Không cookie + vào /chat/X             → cho qua (lớp 2 xử lý)│
├─────────────────────────────────────────────────────────────────┤
│ Lớp 2: Backend WebSocket (chat.gateway.ts)                     │
│                                                                │
│  room:join → isParticipant(userId) = false                     │
│           → emit room:access_denied                            │
│  room:join → getRoom() throws (phòng đã đóng/không tồn tại)   │
│           → emit room:access_denied                            │
├─────────────────────────────────────────────────────────────────┤
│ Lớp 3: Frontend useChat.ts (client-side recovery)              │
│                                                                │
│  Nhận room:access_denied → clearRoomCookie() → redirect /      │
└─────────────────────────────────────────────────────────────────┘
```

**Xử lý stale cookie** (phòng đóng khi user offline):
```
User mở lại trình duyệt, cookie active-room-id = 'deadRoom'
  → Middleware redirect → /chat/deadRoom
  → useChat: room:join → Backend: phòng đã đóng → room:access_denied
  → Frontend: clearRoomCookie() + router.replace('/')  ← phá vòng lặp
  → User vào / bình thường
```

**Cookie lifecycle:**

| Sự kiện | Hành động |
|---|---|
| `room:joined` thành công | `setRoomCookie(roomId)` |
| User gọi `leaveRoom()` | `clearRoomCookie()` |
| User gọi `blockPartner()` | `clearRoomCookie()` |
| Server emit `room:closed` | `clearRoomCookie()` |
| Server emit `room:access_denied` | `clearRoomCookie()` |
| Cookie tự hết hạn | Sau 24 giờ (max-age) |

---

### 4.5 Moderation Pipeline

Mỗi tin nhắn text phải qua:

```
Tin nhắn đến
     │
     ▼
checkText(content)
     │
     ├── Từ cấm? (BANNED_WORDS) ──────┐
     ├── Số điện thoại VN? (regex) ───┤
     ├── Link HTTP/HTTPS? (regex) ─────┤→ isViolation = true → throw Error
     └── Email? (regex) ───────────────┘
     │
     ▼
isViolation = false → lưu DB → broadcast
```

---

## 5. Kiến trúc Frontend — Next.js 15 App Router

```
src/
├── app/
│   ├── layout.tsx            ← Root: ThemeProvider (dark default) + Toaster
│   ├── page.tsx              ← Landing page (public)
│   ├── (auth)/               ← Route group: layout 2 cột (branding + form)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (main)/               ← Route group: layout có Navbar
│       ├── profile/page.tsx
│       ├── matchmaking/page.tsx
│       └── chat/[roomId]/page.tsx
├── components/
│   ├── ui/                   ← shadcn/ui primitives (Button, Input, Toast...)
│   ├── auth/                 ← LoginForm, RegisterForm (react-hook-form + zod)
│   ├── chat/                 ← ChatRoom, MessageBubble, MessageInput, TypingIndicator
│   ├── matchmaking/          ← MatchmakingPanel (queue UI)
│   ├── profile/              ← ProfileForm
│   └── common/               ← Navbar, ThemeProvider, LoadingSpinner
├── hooks/
│   ├── useAuth.ts            ← Wrapper đọc authStore
│   ├── useChat.ts            ← Socket events + room access guard (room:access_denied)
│   ├── useMatchmaking.ts     ← Socket events cho /matchmaking namespace
│   └── use-toast.ts          ← Toast state management
├── lib/
│   ├── api.ts                ← Axios instance: auto-attach JWT, chuẩn hoá lỗi
│   ├── room-cookie.ts        ← Set/clear cookie active-room-id cho middleware
│   ├── socket.ts             ← Socket.IO factory (singleton per namespace)
│   └── utils.ts              ← cn() helper (clsx + tailwind-merge)
├── store/
│   ├── authStore.ts          ← Zustand + persist: user, accessToken, login/logout
│   └── chatStore.ts          ← Zustand: messages, aliases, isTyping
└── types/
    ├── api.types.ts          ← AuthResponse, UserProfile, ApiResponse<T>
    ├── chat.types.ts         ← ChatMessage, RoomInfo
    └── user.types.ts         ← User
```

### Tại sao dùng Route Groups `(auth)` và `(main)`?

Route groups cho phép layout khác nhau mà không ảnh hưởng URL:
- `(auth)` → layout 2 cột branding/form, không có Navbar
- `(main)` → layout có Navbar, cần đăng nhập

---

## 6. Bảo mật & Anti-Abuse

### HTTP Layer

| Cơ chế | Cấu hình |
|---|---|
| **Helmet** | Tự động set các security headers (CSP, HSTS, ...) |
| **CORS** | Chỉ cho phép `FRONTEND_URL` (mặc định localhost:3001) |
| **Rate Limiting** | 60 requests / 60 giây / IP (ThrottlerModule toàn cục) |
| **ValidationPipe** | `whitelist: true` → tự động strip field lạ; `forbidNonWhitelisted` → throw 400 |

### WebSocket Layer

```
Mỗi socket connection:
1. Lấy JWT từ handshake.auth.token hoặc Authorization header
2. JwtService.verify() → nếu fail → socket.disconnect() ngay
3. Gắn socket.userId = payload.sub → các gateway khác dùng
```

### Chat Content Layer

| Vi phạm | Xử lý |
|---|---|
| Từ cấm | Reject message, log warning |
| Số điện thoại VN | Reject message |
| Link (http/https/www) | Reject message |
| Email | Reject message |
| Ảnh (TODO) | Google Vision / AWS Rekognition |

### Anonymous Layer

```
Khi vào phòng chat:
- userId thật → ẩn hoàn toàn
- Hiển thị: nickname ngẫu nhiên (Stranger#7482) + avatar DiceBear
- Chỉ VIP mới thấy profile thật của nhau (Phase 2)
- Sau khi rời phòng: xóa toàn bộ tin nhắn khỏi DB
```

---

## 7. Database Schema

### User
```
{
  email: String (unique, lowercase)
  password: String (bcrypt hash, rỗng nếu OAuth)
  displayName: String
  avatar: String
  provider: "local" | "google" | "facebook"
  role: "user" | "vip" | "admin"
  isEmailVerified: Boolean
  isBanned: Boolean
  bannedAt: Date
  lastSeenAt: Date
  timestamps: true  ← createdAt, updatedAt tự động
}
```

### Profile
```
{
  userId: ObjectId (ref: User, unique)
  gender: "male" | "female" | "other"
  age: Number (13-99)
  bio: String (max 200)
  avatar: String
  chatPreference: "opposite" | "same" | "any"
  preferredGender: "male" | "female" | "other"
  isVip: Boolean
  vipExpiresAt: Date
}
```

### Room
```
{
  roomId: String (UUID, unique)
  participants: [ObjectId] (ref: User, 2 người)
  anonymousNames: Map<userId, nickname>   ← "Stranger#7482"
  anonymousAvatars: Map<userId, avatarUrl>
  status: "active" | "closed"
  closedAt: Date
}
```

### Message *(xóa khi phòng đóng)*
```
{
  roomId: String (index)
  senderId: ObjectId (ref: User)
  senderAlias: String  ← nickname lúc gửi, không lưu userId thật vào message
  type: "text" | "image" | "system"
  content: String
  imageUrl: String
  isModerated: Boolean
  timestamps: true
}
index: { roomId: 1, createdAt: 1 }
```

### Blocklist
```
{
  blockerId: ObjectId (ref: User)
  blockedId: ObjectId (ref: User)
  timestamps: true
}
unique index: { blockerId, blockedId }
```

---

## 8. API Reference

### Auth Endpoints

```
POST /api/auth/register      { email, password, displayName }
POST /api/auth/login         { email, password }
GET  /api/auth/me            (JWT required)
POST /api/auth/refresh       { refreshToken }
GET  /api/auth/google        → redirect Google OAuth
GET  /api/auth/google/callback
GET  /api/auth/facebook      → redirect Facebook OAuth
GET  /api/auth/facebook/callback
```

### User Endpoints

> Chi tiết: [docs/USER_PROFILE.md](docs/USER_PROFILE.md)

```
GET   /api/users/me            (JWT) → tài khoản hiện tại
PATCH /api/users/me            (JWT) { displayName?, avatar? }
```

### Profile Endpoints

```
GET    /api/profile            (JWT) → user + profile + isComplete
POST   /api/profile            (JWT) → tạo hồ sơ
PUT    /api/profile            (JWT) → upsert toàn bộ
PATCH  /api/profile            (JWT) → cập nhật một phần
DELETE /api/profile            (JWT) → xóa hồ sơ
POST   /api/profile/avatar     (JWT) multipart field "avatar"
```

### Matchmaking Endpoints

> Chi tiết: [docs/MATCHMAKING.md](docs/MATCHMAKING.md)

```
POST   /api/matchmaking/join    (JWT) { preference, preferredGender? }
DELETE /api/matchmaking/leave   (JWT)
GET    /api/matchmaking/status  (JWT) → position, queueSize, expiresInSeconds
```

### Blocklist Endpoints

```
POST   /api/blocklist/:targetUserId   (JWT required) → block
DELETE /api/blocklist/:targetUserId   (JWT required) → unblock
```

### Response Format (chuẩn hoá bởi TransformInterceptor)

```json
// Success
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-05-11T..."
}

// Error (HttpExceptionFilter)
{
  "success": false,
  "statusCode": 400,
  "message": ["Email không hợp lệ"],
  "timestamp": "2026-05-11T...",
  "path": "/api/auth/register"
}
```

---

## 9. Socket.IO Events

### Namespace `/matchmaking`

| Direction | Event | Payload | Mô tả |
|---|---|---|---|
| Client → Server | `queue:join` | `{ preference, preferredGender? }` | Vào hàng đợi (socket-only) |
| Client → Server | `queue:sync` | — | Đồng bộ sau HTTP join |
| Client → Server | `queue:leave` | — | Rời hàng đợi |
| Server → Client | `queue:joined` | `QueueStatus` | Trạng thái ban đầu |
| Server → Client | `queue:position` | `QueueStatus` | Cập nhật mỗi 3s |
| Server → Client | `queue:timeout` | `{ message }` | Hết 5 phút |
| Server → Client | `queue:left` | — | Đã rời queue |
| Server → Client | `match:found` | `{ roomId, partnerId }` | Ghép đôi thành công |
| Server → Client | `error` | `{ message }` | Lỗi |

### Namespace `/chat`

| Direction | Event | Payload | Mô tả |
|---|---|---|---|
| Client → Server | `room:join` | `{ roomId }` | Vào phòng |
| Client → Server | `chat:send` | `{ roomId, type, content?, imageUrl? }` | Gửi tin nhắn |
| Client → Server | `chat:typing` | `{ roomId, isTyping }` | Typing indicator |
| Client → Server | `room:leave` | `{ roomId }` | Rời phòng chủ động |
| Client → Server | `room:block` | `{ roomId, targetUserId }` | Block + đóng phòng |
| Server → Client | `room:joined` | `{ session, partnerUserId, messages }` | Xác nhận + nhận session + lịch sử |
| Server → Client | `room:access_denied` | `{ roomId, message }` | Không có quyền vào phòng hoặc phòng đã đóng |
| Server → Client | `room:closed` | `{ roomId }` | Phòng đã đóng (partner rời/block) |
| Server → Client | `room:presence` | `{ userId, online }` | Trạng thái online của partner |
| Server → Client | `chat:message` | `{ id, senderAlias, type, content, imageUrl, createdAt }` | Tin nhắn mới |
| Server → Client | `chat:typing` | `{ isTyping }` | Partner đang gõ |
| Server → Client | `error` | `{ message }` | Lỗi generic |

**Kết nối Socket cần JWT:**
```javascript
const socket = io("http://localhost:3000/chat", {
  auth: { token: "Bearer <accessToken>" }
});
```

---

## 10. Environment Variables

### Backend (`backend/.env.development.local`)

```bash
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/strangerconfide
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=...              # ký accessToken
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=...      # ký refreshToken
JWT_REFRESH_EXPIRES_IN=30d
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://998b-222-252-97-1.ngrok-free.app/api/auth/google/callback
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FRONTEND_URL=http://localhost:3001
```

### Frontend (`frontend/.env.development.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

---

## 11. Khởi động dự án

### Yêu cầu
- Node.js ≥ 20
- MongoDB (local port 27017)
- Redis (local port 6379)

### Các bước

```bash
# 1. Clone và cài dependencies
cd backend  && npm install
cd ../frontend && npm install

# 2. Cấu hình env
# Chỉnh sửa các giá trị trong:
# - backend/.env.development.local
# - frontend/.env.development.local

# 3. Khởi động services
brew services start mongodb-community
brew services start redis

# 4. Chạy backend (port 3000)
cd backend && npm run start:dev

# 5. Chạy frontend (port 3001)
cd frontend && npm run dev
```

Hoặc dùng **VS Code Run & Debug** (Cmd+Shift+D) → chọn **Full Stack: Backend + Frontend** → nhấn ▶

---

## 12. Roadmap theo Phase

### Phase 1 (hiện tại)

- [x] Cấu trúc dự án đầy đủ
- [x] Auth: Register / Login / OAuth / OTP / Refresh Token
- [x] User + Profile: CRUD, upload avatar
- [x] Matchmaking: Redis Queue FIFO, blocklist, timeout 5 phút
- [x] Chat Room: Real-time + Moderation + Anonymous (Phase 5)

### Phase 2 🔜
- [ ] Voice Chat (WebRTC)
- [ ] VIP: xem profile thật đối phương
- [ ] Report system đầy đủ (lưu DB, xét duyệt)
- [ ] Admin dashboard

### Phase 3 🔜
- [ ] Thanh toán VIP (Stripe / VNPay)
- [ ] Matching nâng cao (sở thích, mood)
- [ ] Mobile app (React Native)

---

## 13. Tài liệu theo module

| Tài liệu | Nội dung |
|----------|-----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Tổng quan kiến trúc (file này) |
| [docs/AUTH.md](docs/AUTH.md) | Authentication, OTP, OAuth, JWT |
| [docs/USER_PROFILE.md](docs/USER_PROFILE.md) | User & Profile API |
| [docs/MATCHMAKING.md](docs/MATCHMAKING.md) | Redis Queue, ghép đôi, WebSocket |
| [docs/ERROR_RESPONSE.md](docs/ERROR_RESPONSE.md) | Luồng lỗi, ApiErrorResponseDto, ApiCode enum |

---

## 14. Quy tắc đóng góp code

1. **Mỗi domain = 1 module** — không để business logic của module A vào module B
2. **Service không gọi thẳng Mongoose** — phải qua Repository
3. **Mọi input HTTP phải có DTO + class-validator**
4. **Mọi lỗi phải dùng Typed Exception** trong `common/exceptions/`
5. **Không lưu thông tin nhận diện thật vào Message** — chỉ lưu `senderAlias`
6. **Safety check trước khi lưu** — luôn gọi `ModerationService` với tin nhắn text/ảnh
