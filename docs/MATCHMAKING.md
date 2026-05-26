# Module Matchmaking — Tài liệu kỹ thuật

> Ghép đôi người dùng ẩn danh qua **Redis Queue (FIFO)**.  
> Phase 4 trong PROJECT_RULES — hoàn thành.

---

## 1. Tổng quan

| Mục tiêu | Cách đạt được |
|----------|----------------|
| User chọn preference | `chatPreference` (opposite/same/any) + `preferredGender` (male/female/other) |
| API "Tìm người tâm sự" | `POST /api/matchmaking/join` |
| FIFO, ưu tiên chờ lâu | Redis Sorted Set, score = `joinedAt` |
| Vị trí chờ thực tế | `ZRANK` + cleanup entry mồ côi |
| Timeout 5 phút | TTL Redis + `expiresAt` + event `queue:timeout` |
| Không ghép người đã block | `BlocklistService.getMutualBlockIds()` (hai chiều) |
| Cleanup khi disconnect | `handleDisconnect` + `queue:leave` |
| Real-time UI | WebSocket namespace `/matchmaking` |

---

## 2. Kiến trúc

```
┌──────────────┐     POST /matchmaking/join      ┌─────────────────────┐
│   Frontend   │ ──────────────────────────────► │ MatchmakingController│
│ Matchmaking  │                                 └──────────┬──────────┘
│    Panel     │     WebSocket /matchmaking                 │
└──────┬───────┘ ──────────────────────────────► ┌────────▼──────────┐
       │                                           │ MatchmakingGateway │
       │  queue:sync / queue:join / queue:leave    └────────┬──────────┘
       │                                                     │
       │                              ┌──────────────────────┼──────────────────────┐
       │                              ▼                      ▼                      ▼
       │                    ┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
       │                    │MatchmakingService│    │ProfileService │    │RoomService  │
       │                    └────────┬─────────┘    └──────────────┘    └─────────────┘
       │                             │
       │                             ▼
       │                    ┌─────────────────┐
       └◄── match:found ────│      Redis      │
                             │  ZSET + STRING  │
                             └─────────────────┘
```

### Cấu trúc file Backend

```
backend/src/modules/matchmaking/
├── matchmaking.module.ts       # Import Profile, Blocklist, Room, Jwt
├── matchmaking.controller.ts   # REST: join, leave, status
├── matchmaking.service.ts      # Queue logic, atomic match
├── matchmaking.gateway.ts      # WebSocket + JWT + position loop
├── config/
│   └── multer.config.ts        # (không dùng ở matchmaking)
└── dto/
    ├── join-queue.dto.ts
    └── queue-status.dto.ts
```

### Cấu trúc file Frontend

```
frontend/src/
├── app/(main)/matchmaking/page.tsx
├── components/matchmaking/MatchmakingPanel.tsx
├── hooks/useMatchmaking.ts
└── lib/matchmaking-api.ts
```

---

## 3. Redis Data Model

| Key | Kiểu | Mô tả |
|-----|------|--------|
| `matchmaking:queue` | Sorted Set | `member=userId`, `score=joinedAt` (ms) — FIFO |
| `matchmaking:entry:{userId}` | String (JSON) | Metadata user trong queue, TTL = thời gian còn lại |
| `matchmaking:lock:{userId}` | String | Lock 8s khi đang `tryAtomicMatch` |
| `matchmaking:pair:{idA}:{idB}` | String | Lock 15s khi claim cặp (id sort alphabetically) |
| `matchmaking:pending:{userId}` | String | Kết quả match chờ client connect socket |

### QueueEntry (JSON)

```typescript
{
  userId: string;
  socketId: string;           // hoặc "pending:{userId}" nếu mới join qua HTTP
  preference: 'opposite' | 'same' | 'any';
  preferredGender?: 'male' | 'female' | 'other';
  gender: 'male' | 'female' | 'other';  // từ Profile
  joinedAt: number;             // Unix ms
  expiresAt: number;            // joinedAt + 300_000
}
```

---

## 4. Thuật toán ghép đôi

### 4.1 Vào queue (`joinQueue`)

1. Kiểm tra **Profile** có `gender` + `age` → nếu không: `ProfileIncompleteException`
2. Nếu đã trong queue → cập nhật `socketId` + preference (giữ `joinedAt` — không mất FIFO)
3. Tạo `QueueEntry`, `SETEX` entry, `ZADD` queue

### 4.2 Tìm match (`tryAtomicMatch`)

```
1. SETNX lock:userId (8s)
2. Load entry + kiểm tra expiresAt
3. Load mutualBlockIds (block + blocked-by)
4. ZRANGE queue 0 -1  (từ score thấp → cao = chờ lâu nhất trước)
5. Với mỗi candidate:
   - Skip: chính mình, block, entry hết hạn/mồ côi
   - Kiểm tra isCompatible()
   - claimPair(userId, candidateId) → atomic MULTI zrem + del
6. DEL lock:userId
```

### 4.3 Quy tắc tương thích (`isCompatible`)

Cả **hai chiều** phải thỏa:

**A. `preferredGender` (giới tính đối phương mong muốn)**

| preferredGender | Điều kiện |
|-----------------|-----------|
| không set / any | luôn OK |
| male / female / other | `otherGender` phải khớp |

**B. `preference` (chatPreference: opposite / same / any)**

| preference | Điều kiện |
|------------|-----------|
| any | luôn OK |
| opposite | male↔female |
| same | cùng gender |

---

## 5. Xử lý Race Condition

| Tình huống | Giải pháp |
|------------|-----------|
| A và B cùng match một người C | `claimPair` lock — chỉ một transaction xóa C thành công |
| A và B cùng match nhau | `pair:lock` sorted ids — một bên claim trước |
| Hai `tryAtomicMatch` cùng user | `lock:userId` SETNX |
| Entry trong ZSET nhưng key JSON hết hạn | `cleanupStaleEntries` khi đọc status/position |
| Đối phương chưa mở WebSocket | `setPendingMatch` → `consumePendingMatch` khi `queue:sync` |

---

## 6. REST API

Tất cả endpoint yêu cầu **JWT** (`Authorization: Bearer <token>`).

### POST `/api/matchmaking/join`

**Body:**
```json
{
  "preference": "any",
  "preferredGender": "female"
}
```

| Field | Bắt buộc | Mô tả |
|-------|---------|--------|
| preference | ✅ | `opposite` \| `same` \| `any` |
| preferredGender | ❌ | `male` \| `female` \| `other` |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "inQueue": true,
    "position": 3,
    "queueSize": 5,
    "waitSeconds": 12,
    "expiresInSeconds": 288,
    "preference": "any",
    "preferredGender": "female",
    "timedOut": false
  }
}
```

**Lỗi thường gặp:**

| Status | Message |
|--------|---------|
| 400 | Hồ sơ chưa hoàn thiện (thiếu gender/age) |
| 401 | Chưa đăng nhập |

---

### DELETE `/api/matchmaking/leave`

Rời hàng đợi.

**Response:**
```json
{ "success": true, "data": { "message": "Đã rời hàng đợi" } }
```

---

### GET `/api/matchmaking/status`

Lấy trạng thái hiện tại (polling fallback).

---

## 7. WebSocket — Namespace `/matchmaking`

### Kết nối

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/matchmaking', {
  auth: { token: localStorage.getItem('accessToken') },
});
```

JWT được verify trong `MatchmakingGateway.handleConnection`. Thiếu/invalid token → disconnect.

### Events

| Hướng | Event | Payload | Mô tả |
|-------|-------|---------|--------|
| C→S | `queue:join` | `JoinQueueDto` | Vào queue (socket-only flow) |
| C→S | `queue:sync` | — | Sau HTTP join — cập nhật socketId |
| C→S | `queue:leave` | — | Huỷ tìm kiếm |
| S→C | `queue:joined` | `QueueStatusResponse` | Xác nhận + trạng thái ban đầu |
| S→C | `queue:position` | `QueueStatusResponse` | Cập nhật mỗi **3 giây** |
| S→C | `queue:timeout` | `{ message }` | Hết 5 phút |
| S→C | `queue:left` | — | Đã rời queue |
| S→C | `match:found` | `{ roomId, partnerId }` | Ghép thành công → vào chat |
| S→C | `error` | `{ message }` | Lỗi |

### Luồng Frontend khuyến nghị (HTTP + Socket)

```
1. POST /api/matchmaking/join     → vào Redis (socketId = pending)
2. Connect socket /matchmaking
3. emit queue:sync              → gắn socketId thật, bắt position loop
4. Nhận queue:position mỗi 3s
5. Nhận match:found → router.push(/chat/{roomId})
```

### Disconnect

`handleDisconnect` tự động gọi `leaveQueue(userId)` — xóa khỏi Redis.

---

## 8. Tích hợp Room

Khi ghép thành công:

```typescript
const room = await roomService.createRoom([userId, partnerId]);
// room.roomId = UUID
// anonymousNames + anonymousAvatars được gán tự động
```

Client redirect: `/chat/{roomId}`

---

## 9. Frontend UI (`/matchmaking`)

**MatchmakingPanel** hiển thị:

- Form chọn preference trước khi tìm
- Trạng thái chờ: **#vị trí**, **số người đang chờ**, **đã chờ**, **thời gian còn lại**
- Nút **Huỷ tìm kiếm**
- Link cập nhật `/profile` nếu hồ sơ chưa đủ

**Hook `useMatchmaking`:**

- `joinQueue(payload, onMatchFound)`
- `leaveQueue()`
- State: `isInQueue`, `position`, `queueSize`, `waitSeconds`, `expiresInSeconds`, `error`

---

## 10. Edge Cases & Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| Không ghép được dù queue có người | Preference không tương thích | Nới `preference` / `preferredGender` |
| Position = 0 nhưng vẫn "đang chờ" | Race cleanup | Gọi lại `GET /status` |
| Mất queue sau refresh | Chưa gọi leave nhưng socket disconnect | Join lại — FIFO reset `joinedAt` nếu join mới |
| `match:found` nhưng không vào phòng | roomId sai / chưa join chat socket | Kiểm tra `/chat/{roomId}` |
| Redis connection refused | Redis chưa chạy | `brew services start redis` |

### Kiểm tra Redis thủ công

```bash
redis-cli ZRANGE matchmaking:queue 0 -1 WITHSCORES
redis-cli GET matchmaking:entry:<userId>
```

---

## 11. Rate Limiting

| Endpoint | Giới hạn |
|----------|----------|
| `POST /matchmaking/join` | 10 req / phút / IP |

---

## 12. Phụ thuộc module

```typescript
// matchmaking.module.ts
imports: [
  ProfileModule,    // gender, age — bắt buộc trước khi join
  BlocklistModule,  // getMutualBlockIds
  RoomModule,       // createRoom khi match
  JwtModule,        // xác thực socket
]
```

---

## 13. Phase tiếp theo

Sau matchmaking, user vào **Phase 5 — Room & Chat**:

- Chat real-time (`/chat` namespace)
- Moderation tin nhắn
- Typing indicator
- Report / Block trong phòng
- Xóa messages khi rời phòng

Xem thêm: [ARCHITECTURE.md](../ARCHITECTURE.md) §4.3
http://localhost:3001/chat/3bde12cb-5e59-4c22-9e6f-a84b41685a9b
3bde12cb-5e59-4c22-9e6f-a84b41685a9b