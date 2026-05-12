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

```
[Client] kết nối WebSocket tới /matchmaking
    → MainGateway.handleConnection()
        → verify JWT từ handshake.auth.token
        → gắn socket.userId = payload.sub

[Client] emit "queue:join" { preference: "any" }
    → MatchmakingGateway.handleJoinQueue()
        → MatchmakingService.joinQueue()
            → Redis SETEX matchmaking:queue:{userId} 300s  ← TTL 5 phút
            → Redis ZADD matchmaking:queue {timestamp} {userId}  ← sorted set FIFO
        → emit "queue:joined" { position: N }
        → tryMatch() chạy ngay:
            → Redis ZRANGE lấy top 50 user chờ lâu nhất
            → Lọc: bỏ qua nếu trong blocklist, kiểm tra gender preference
            → Nếu tìm được match:
                → leaveQueue(userId), leaveQueue(matchId)
                → emit "match:found" { roomId } cho CẢ HAI socket

[Client A & B] nhận "match:found" → điều hướng sang /chat/{roomId}
```

**Sơ đồ Redis data structure:**
```
matchmaking:queue (Sorted Set)
  score = timestamp  →  FIFO ordering
  member = userId

matchmaking:queue:{userId} (String, TTL 300s)
  value = JSON { userId, socketId, preference, preferredGender, gender, joinedAt }
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

[Client] emit "room:leave" HOẶC disconnect đột ngột
    → closeRoomCleanup():
        → emit "chat:partner_left" cho người còn lại
        → RoomService.closeRoom()  ← status = "closed"
        → ChatService.deleteRoomMessages()  ← XÓA TOÀN BỘ tin nhắn
        → socket.leave(roomId)
```

---

### 4.4 Moderation Pipeline

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
│   ├── useChat.ts            ← Socket events cho /chat namespace
│   ├── useMatchmaking.ts     ← Socket events cho /matchmaking namespace
│   └── use-toast.ts          ← Toast state management
├── lib/
│   ├── api.ts                ← Axios instance: auto-attach JWT, chuẩn hoá lỗi
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

### Profile Endpoints

```
GET  /api/profile            (JWT required) → profile của mình
PUT  /api/profile            (JWT required) { gender, age, bio, chatPreference, ... }
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
| Client → Server | `queue:join` | `{ preference, preferredGender? }` | Vào hàng đợi |
| Client → Server | `queue:leave` | — | Rời hàng đợi |
| Server → Client | `queue:joined` | `{ position }` | Xác nhận vào queue |
| Server → Client | `queue:left` | — | Xác nhận rời queue |
| Server → Client | `match:found` | `{ roomId, partnerId }` | Ghép đôi thành công |
| Server → Client | `error` | `{ message }` | Lỗi |

### Namespace `/chat`

| Direction | Event | Payload | Mô tả |
|---|---|---|---|
| Client → Server | `room:join` | `{ roomId }` | Vào phòng |
| Client → Server | `chat:send` | `{ roomId, type, content?, imageUrl? }` | Gửi tin nhắn |
| Client → Server | `chat:typing` | `{ roomId, isTyping }` | Typing indicator |
| Client → Server | `room:leave` | `{ roomId }` | Rời phòng chủ động |
| Server → Client | `room:joined` | `{ roomId, alias }` | Xác nhận + nhận nickname |
| Server → Client | `chat:message` | `{ id, senderAlias, type, content, imageUrl, createdAt }` | Tin nhắn mới |
| Server → Client | `chat:typing` | `{ userId, isTyping }` | Partner đang gõ |
| Server → Client | `chat:partner_left` | — | Đối phương rời phòng |
| Server → Client | `error` | `{ message }` | Lỗi |

**Kết nối Socket cần JWT:**
```javascript
const socket = io("http://localhost:3000/chat", {
  auth: { token: "Bearer <accessToken>" }
});
```

---

## 10. Environment Variables

### Backend (`backend/.env`)

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
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FRONTEND_URL=http://localhost:3001
```

### Frontend (`frontend/.env.local`)

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
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Chỉnh sửa các giá trị trong .env

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

### Phase 1 (hiện tại) ✅
- [x] Cấu trúc dự án đầy đủ
- [ ] Auth: Register / Login / OAuth / Email Verification
- [ ] Profile: CRUD
- [ ] Matchmaking: Redis Queue + ghép đôi
- [ ] Chat Room: Real-time + Moderation + Anonymous

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

## 13. Quy tắc đóng góp code

1. **Mỗi domain = 1 module** — không để business logic của module A vào module B
2. **Service không gọi thẳng Mongoose** — phải qua Repository
3. **Mọi input HTTP phải có DTO + class-validator**
4. **Mọi lỗi phải dùng Typed Exception** trong `common/exceptions/`
5. **Không lưu thông tin nhận diện thật vào Message** — chỉ lưu `senderAlias`
6. **Safety check trước khi lưu** — luôn gọi `ModerationService` với tin nhắn text/ảnh
