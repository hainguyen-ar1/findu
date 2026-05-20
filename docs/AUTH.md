# Module Authentication — Tài liệu kỹ thuật

> Phase 2 — Đăng ký, đăng nhập, OTP, OAuth, JWT.

---

## 1. Tính năng

| Tính năng | Trạng thái |
|-----------|------------|
| Đăng ký / đăng nhập Email + Password | ✅ |
| Xác thực email OTP (6 số, 10 phút) | ✅ |
| Google OAuth | ✅ (cần cấu hình `.env`) |
| Facebook OAuth | ✅ (cần cấu hình `.env`) |
| JWT access + refresh token | ✅ |
| Rate limiting auth endpoints | ✅ |
| Protected routes (backend global guard) | ✅ |
| Frontend middleware (`auth-token` cookie) | ✅ |

---

## 2. REST API

| Method | Endpoint | Public | Mô tả |
|--------|----------|--------|--------|
| POST | `/api/auth/register` | ✅ | Đăng ký → gửi OTP |
| POST | `/api/auth/login` | ✅ | Đăng nhập (chặn nếu chưa verify) |
| POST | `/api/auth/verify-email` | ✅ | Xác thực OTP → trả JWT |
| POST | `/api/auth/resend-otp` | ✅ | Gửi lại OTP |
| POST | `/api/auth/refresh` | ✅ | Làm mới token |
| GET | `/api/auth/me` | ❌ | User hiện tại |
| GET | `/api/auth/google` | ✅ | OAuth redirect |
| GET | `/api/auth/facebook` | ✅ | OAuth redirect |

### Rate limits (mỗi phút / IP)

| Endpoint | Limit |
|----------|-------|
| register | 5 |
| login | 10 |
| resend-otp | 3 |
| verify-email | 10 |
| refresh | 20 |

---

## 3. Luồng OTP

```
Register → User (isEmailVerified=false) → OTP email
Verify OTP → isEmailVerified=true → JWT
Login (chưa verify) → gửi lại OTP + lỗi 400
```

---

## 4. Frontend

| Route | Mô tả |
|-------|--------|
| `/register` | Đăng ký |
| `/login` | Đăng nhập + OAuth buttons |
| `/verify-email` | Nhập OTP 6 số |
| `/auth/callback` | Nhận token từ OAuth redirect |

**Storage:** `localStorage` (accessToken, refreshToken) + cookie `auth-token` (cho middleware).

**Auto refresh:** `api.ts` interceptor — 401 → `POST /auth/refresh` → retry request.

---

## 5. Biến môi trường

```bash
JWT_SECRET=...
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES_IN=30d
MAIL_HOST=...
MAIL_USER=...
MAIL_PASS=...
GOOGLE_CLIENT_ID=...
FACEBOOK_APP_ID=...
```
