# Module User & Profile — Tài liệu kỹ thuật

> Phase 3 — Quản lý tài khoản và hồ sơ trước khi matchmaking.

---

## 1. Tổng quan

| Module | Trách nhiệm |
|--------|-------------|
| **User** | Tài khoản: email, displayName, avatar, role, OAuth |
| **Profile** | Hồ sơ matchmaking: gender, age, bio, chatPreference |

**Lưu ý:** `displayName` và `avatar` có thể cập nhật qua **User** hoặc **Profile** (đồng bộ khi upload avatar).

---

## 2. User Module

### API (JWT required)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/users/me` | Thông tin tài khoản (không có password) |
| PATCH | `/api/users/me` | Cập nhật `displayName`, `avatar` (URL) |

### Response mẫu `GET /users/me`

```json
{
  "id": "...",
  "email": "user@example.com",
  "displayName": "Alex",
  "avatar": "/uploads/avatars/xxx.jpg",
  "role": "user",
  "provider": "local",
  "isEmailVerified": true
}
```

---

## 3. Profile Module

### API (JWT required)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/profile` | User + profile + `isComplete` |
| POST | `/api/profile` | Tạo hồ sơ lần đầu |
| PUT | `/api/profile` | Tạo mới hoặc thay thế toàn bộ |
| PATCH | `/api/profile` | Cập nhật một phần |
| DELETE | `/api/profile` | Xóa hồ sơ (giữ user) |
| POST | `/api/profile/avatar` | Upload ảnh (multipart, field `avatar`) |

### `isComplete`

`true` khi profile có đủ **gender** và **age** — bắt buộc để vào matchmaking.

### Upload avatar

- Định dạng: JPEG, PNG, WebP, GIF
- Tối đa: `MAX_FILE_SIZE_MB` (mặc định 5MB)
- Lưu tại: `uploads/avatars/{uuid}.ext`
- URL public: `http://localhost:3000/uploads/avatars/...`

---

## 4. Frontend

| Route | Component | Mô tả |
|-------|-----------|--------|
| `/profile` | `ProfileView` + `ProfileForm` | Xem / chỉnh sửa hồ sơ |

**Libs:** `profile-api.ts`, `userApi` (trong `profile-api.ts`)

---

## 5. Entity Schema (tóm tắt)

**User:** email, password, displayName, avatar, provider, role, isEmailVerified, isBanned

**Profile:** userId, gender, age, bio, avatar, chatPreference, preferredGender, isVip

Chi tiết: [ARCHITECTURE.md](../ARCHITECTURE.md) §7
