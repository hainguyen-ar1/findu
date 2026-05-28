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
| POST | `/api/auth/google` | ✅ | Đăng nhập Google (mobile) — body `{ idToken }` |
| GET | `/api/auth/google` | ✅ | OAuth redirect (web) |
| GET | `/api/auth/google/callback` | ✅ | OAuth callback (web) |
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

### Bypass tạm thời (dev)

- Nhập **`000000`** tại `/verify-email` để bỏ qua OTP (không cần mail).
- Chỉ hoạt động khi `NODE_ENV !== production` hoặc `ALLOW_OTP_BYPASS=true`.
- OTP email/SMTP sẽ hoàn thiện ở phase sau.

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

## 5. Swagger

- UI: `http://localhost:3000/api/docs`
- Response mẫu (Example Value) mô tả envelope `{ success, data, timestamp }` và object `data` đầy đủ field + kiểu.
- API protected: bấm **Authorize**, dán `accessToken` (không thêm chữ `Bearer`).

## 6. Biến môi trường

```bash
JWT_SECRET=...
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES_IN=30d
MAIL_HOST=...
MAIL_USER=...
MAIL_PASS=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://998b-222-252-97-1.ngrok-free.app/api/auth/google/callback
# GOOGLE_CLIENT_IDS=... (Android/iOS client IDs, nếu có)
FACEBOOK_APP_ID=...
```

### Google Sign-In (mobile)

1. App dùng Google Sign-In SDK → nhận `idToken`.
2. `POST /api/auth/google` với body:

```json
{ "idToken": "<google-id-token>" }
```

3. Response giống `POST /api/auth/login` (accessToken, refreshToken, user).

**Lưu ý:** `aud` trong idToken phải khớp một trong `GOOGLE_CLIENT_ID` hoặc `GOOGLE_CLIENT_IDS`. Tạo OAuth client riêng cho Android/iOS trên Google Cloud Console nếu cần.
```
