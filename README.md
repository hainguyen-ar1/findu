# StrangerConfide

> Ứng dụng "Tâm sự với người lạ" - Anonymous 1:1 Chat thời gian thực.

## Tech Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Backend    | NestJS · MongoDB · Redis · Socket.IO · JWT + OAuth2     |
| Frontend   | Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui |
| Infra      | Docker Compose · GitHub Actions                         |

## Cấu trúc dự án

```
strangerconfide/
├── backend/          # NestJS API + Socket.IO
├── frontend/         # Next.js 15 App Router
└── docker-compose.yml
```

## Khởi động nhanh

```bash
# Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Chạy toàn bộ stack
docker compose up -d

# Hoặc chạy riêng lẻ (dev mode)
cd backend && npm run start:dev
cd frontend && npm run dev
```

## Phases

- **Phase 1** ✅ Authentication → Profile → Matchmaking → Chat Room
- **Phase 2** 🔜 Voice Chat (WebRTC)
- **Phase 3** 🔜 Thanh toán VIP thật
