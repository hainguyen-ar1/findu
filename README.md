# StrangerConfide

> Ứng dụng "Tâm sự với người lạ" - Anonymous 1:1 Chat thời gian thực.

## Tech Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Backend    | NestJS · MongoDB · Redis · Socket.IO · JWT + OAuth2     |
| Frontend   | Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui |
| Infra      | Docker Compose                                          |

## Cấu trúc dự án

```
findu/
├── backend/              # NestJS API + Socket.IO
├── frontend/             # Next.js 15 App Router
├── docs/                 # Tài liệu theo module
├── ARCHITECTURE.md       # Kiến trúc tổng quan
└── docker-compose.yml
```

## Tài liệu

| File | Mô tả |
|------|--------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Kiến trúc, flow, API tổng hợp, database schema |
| [docs/AUTH.md](docs/AUTH.md) | Đăng ký, OTP, OAuth, JWT, protected routes |
| [docs/USER_PROFILE.md](docs/USER_PROFILE.md) | User & Profile CRUD, upload avatar |
| [docs/MATCHMAKING.md](docs/MATCHMAKING.md) | Redis Queue, FIFO, WebSocket, race condition |
| [docs/CHAT.md](docs/CHAT.md) | Room ẩn danh, chat realtime, moderation, report/block |
| [docs/ERROR_RESPONSE.md](docs/ERROR_RESPONSE.md) | Luồng lỗi, ApiErrorResponseDto, ApiCode enum |
| [.cursor/rules/PROJECT_RULES.mdc](.cursor/rules/PROJECT_RULES.mdc) | Quy tắc dự án (Cursor) |

## Khởi động nhanh

### Yêu cầu

- Node.js ≥ 20
- MongoDB (port 27017)
- Redis (port 6379)

### Dev mode

```bash
# Copy env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Services
brew services start mongodb-community
brew services start redis

# Backend (port 3000)
cd backend && npm install && npm run start:dev

# Frontend (port 3001)
cd frontend && npm install && npm run dev
```

### Docker

```bash
docker compose up -d
```

### VS Code Debug

`Run & Debug` → **Full Stack: Backend + Frontend**

## Tiến độ Phase 1

| Phase | Module | Trạng thái |
|-------|--------|------------|
| 2 | Authentication | ✅ |
| 3 | User + Profile | ✅ |
| 4 | Matchmaking (Redis) | ✅ |
| 5 | Room & Chat | ✅ |

## URL dev

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:3000/api |
| Swagger UI | http://localhost:3000/api/docs |
| OpenAPI JSON | http://localhost:3000/api/docs-json |
| WebSocket | http://localhost:3000 |
