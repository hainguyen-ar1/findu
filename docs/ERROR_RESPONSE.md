# Luồng xử lý lỗi — `ApiErrorResponseDto`

> Mọi lỗi trong StrangerConfide đều trả về **cùng một shape** với response thành công.
> Client chỉ cần kiểm tra `success: false` thay vì phân tích HTTP status code.

---

## 1. Shape response lỗi

```ts
// common/dto/api-error-response.dto.ts
{
  success:    false,
  statusCode: number,          // HTTP status (400, 401, 403, 404, 409, 500, ...)
  code:       string,          // ApiCode — machine-readable, dùng để switch-case ở client
  message:    string,          // Thông báo human-readable bằng tiếng Việt
  data:       null,            // Luôn null khi lỗi
  errors:     FieldError[] | null,  // Chỉ có khi VALIDATION_ERROR
  meta:       null,            // Luôn null khi lỗi
  requestId:  string,          // "req_8af2c1de9012ab34" — dùng để tra log
  path:       string,          // URL gốc của request
  timestamp:  string,          // ISO 8601
}

// FieldError — mỗi phần tử trong errors[]
{
  field:   string,   // Tên field bị lỗi, ví dụ: "email", "age"
  message: string,   // Mô tả lỗi của field đó
}
```

**Ví dụ thực tế — lỗi validation:**

```json
{
  "success": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "data": null,
  "errors": [
    { "field": "email", "message": "email must be an email" },
    { "field": "password", "message": "password phải có ít nhất 6 ký tự" }
  ],
  "meta": null,
  "requestId": "req_8af2c1de9012ab34",
  "path": "/api/auth/register",
  "timestamp": "2026-05-22T16:21:01.289Z"
}
```

**Ví dụ thực tế — lỗi nghiệp vụ:**

```json
{
  "success": false,
  "statusCode": 401,
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "Email hoặc mật khẩu không đúng",
  "data": null,
  "errors": null,
  "meta": null,
  "requestId": "req_f1e2d3c4b5a69870",
  "path": "/api/auth/login",
  "timestamp": "2026-05-22T16:21:01.289Z"
}
```

---

## 2. Luồng xử lý lỗi (Request → Response)

```
[Client Request]
      │
      ▼
RequestIdMiddleware          ← Gán / nhận X-Request-Id
      │
      ▼
ValidationPipe               ← Validate DTO (class-validator)
      │    ├── OK → vào Controller
      │    └── FAIL → throw HttpException { message: string[] }
      │
      ▼
Controller / Service / Repository
      │    ├── OK → TransformInterceptor wraps response
      │    ├── throw AppException        ← lỗi nghiệp vụ chuẩn
      │    ├── throw HttpException       ← lỗi NestJS / thư viện
      │    └── throw Error (bất kỳ)     ← lỗi không xác định
      │
      ▼
HttpExceptionFilter (@Catch())
      │    ├── AppException     → đọc code + fieldErrors trực tiếp
      │    ├── HttpException    → mapHttpStatusToCode() + parseValidationMessage()
      │    └── Unknown Error    → 500 INTERNAL_ERROR
      │
      ▼
[JSON Response]  { success: false, statusCode, code, message, data: null, errors, ... }
```

---

## 3. Các thành phần tham gia

### 3.1 `RequestIdMiddleware`

**File:** [`common/middleware/request-id.middleware.ts`](../backend/src/common/middleware/request-id.middleware.ts)

Chạy trước mọi request, sinh hoặc nhận `X-Request-Id` từ header:

```
Client gửi X-Request-Id: my-custom-id-123
  → Server tôn trọng giá trị đó → req.requestId = "my-custom-id-123"

Client không gửi X-Request-Id
  → Server tự sinh: req.requestId = "req_8af2c1de9012ab34"
```

`requestId` được ghi vào log và trả lại trong body response — giúp tìm log đúng request khi debug.

---

### 3.2 `AppException` — Exception nội bộ chuẩn

**File:** [`common/exceptions/app.exception.ts`](../backend/src/common/exceptions/app.exception.ts)

```ts
throw new AppException(
  {
    code: ApiCode.USER_NOT_FOUND,
    message: 'Người dùng không tồn tại',
  },
  HttpStatus.NOT_FOUND,
);
```

- Extends `HttpException` của NestJS.
- Bắt buộc phải có `code` (một giá trị từ `ApiCode` enum).
- Tùy chọn có `errors: FieldError[]` cho validation từng field thủ công.

---

### 3.3 Typed Exceptions — Dùng thay vì `throw new AppException` trực tiếp

**File:** [`common/exceptions/app.exceptions.ts`](../backend/src/common/exceptions/app.exceptions.ts)

Mỗi tình huống lỗi thường gặp có một class riêng, tránh lặp `code` + `message`:

| Class | HTTP | ApiCode |
|---|---|---|
| `UserNotFoundException` | 404 | `USER_NOT_FOUND` |
| `InvalidCredentialsException` | 401 | `AUTH_INVALID_CREDENTIALS` |
| `EmailAlreadyExistsException` | 409 | `AUTH_EMAIL_EXISTS` |
| `RoomNotFoundException` | 404 | `ROOM_NOT_FOUND` |
| `UserBlockedException` | 403 | `CHAT_BLOCKED_BY_USER` |
| `AlreadyInQueueException` | 409 | `MATCHMAKING_ALREADY_IN_QUEUE` |
| `ProfileNotFoundException` | 404 | `PROFILE_NOT_FOUND` |
| `ProfileAlreadyExistsException` | 409 | `PROFILE_ALREADY_EXISTS` |

**File:** [`common/exceptions/matchmaking.exceptions.ts`](../backend/src/common/exceptions/matchmaking.exceptions.ts)

| Class | HTTP | ApiCode |
|---|---|---|
| `ProfileIncompleteException` | 400 | `PROFILE_INCOMPLETE` |
| `NotInQueueException` | 404 | `NOT_FOUND` |
| `QueueTimeoutException` | 408 | `MATCHMAKING_TIMEOUT` |

---

### 3.4 `HttpExceptionFilter` — Trung tâm xử lý lỗi

**File:** [`common/filters/http-exception.filter.ts`](../backend/src/common/filters/http-exception.filter.ts)

Decorator `@Catch()` (không tham số) — bắt **mọi loại exception**, kể cả `Error` thô:

```
exception
  ├── instanceof AppException
  │     → lấy code, message, fieldErrors trực tiếp từ exception
  │
  ├── instanceof HttpException  (ValidationPipe, AuthGuard, NestJS built-in...)
  │     ├── message là string[]  → tạo errors[] + code = VALIDATION_ERROR
  │     └── message là string   → mapHttpStatusToCode(status) làm fallback code
  │
  └── Bất kỳ (Error, TypeError, MongoError...)
        → 500, code = INTERNAL_ERROR, message = "Lỗi máy chủ..."
```

**Luồng ValidationPipe (quan trọng):**

Khi `ValidationPipe` thất bại, nó throw `HttpException` với `message` là **mảng string**:

```
["email must be an email", "password phải có ít nhất 6 ký tự"]
```

Filter sẽ:
1. Nhận dạng `Array.isArray(rawMessage)` → đây là validation error
2. Gọi `parseValidationMessage(msg)` cho mỗi phần tử
3. Heuristic tách: từ đầu tiên → `field`, toàn bộ string → `message`
4. Trả `errors[]` về client, `code = VALIDATION_ERROR`

> `parseValidationMessage` hoạt động theo heuristic — từ đầu tiên phải match `/^[a-zA-Z_][a-zA-Z0-9_]*$/`.
> Nếu không match, `field = '_'`.

---

### 3.5 `ApiCode` enum — Mã lỗi machine-readable

**File:** [`common/constants/api-code.enum.ts`](../backend/src/common/constants/api-code.enum.ts)

Client (Next.js / Flutter) dùng `code` để switch-case, không phụ thuộc `message` (có thể thay đổi):

```ts
// Ví dụ client xử lý
switch (error.code) {
  case 'AUTH_INVALID_CREDENTIALS':
    showToast('Email hoặc mật khẩu không đúng');
    break;
  case 'VALIDATION_ERROR':
    highlightFields(error.errors);
    break;
  case 'RATE_LIMITED':
    showToast('Thử lại sau ít phút');
    break;
}
```

**Danh sách đầy đủ các `ApiCode`:**

| Code | HTTP thường gặp | Ý nghĩa |
|---|---|---|
| `OK` | 200 | Thành công |
| `CREATED` | 201 | Tạo mới thành công |
| `VALIDATION_ERROR` | 400 | Input không hợp lệ |
| `INTERNAL_ERROR` | 500 | Lỗi server không xác định |
| `RATE_LIMITED` | 429 | Quá nhiều request |
| `NOT_FOUND` | 404 | Tài nguyên không tồn tại (generic) |
| `FORBIDDEN` | 403 | Không có quyền (generic) |
| `AUTH_UNAUTHORIZED` | 401 | Chưa đăng nhập / token hết hạn |
| `AUTH_INVALID_CREDENTIALS` | 401 | Sai email hoặc mật khẩu |
| `AUTH_EMAIL_EXISTS` | 409 | Email đã được dùng |
| `AUTH_INVALID_OTP` | 400 | Mã OTP sai |
| `AUTH_OTP_EXPIRED` | 400 | Mã OTP hết hạn |
| `AUTH_EMAIL_NOT_VERIFIED` | 403 | Email chưa xác thực |
| `AUTH_REFRESH_FAILED` | 401 | Refresh token không hợp lệ |
| `AUTH_USER_BANNED` | 403 | Tài khoản bị khóa |
| `USER_NOT_FOUND` | 404 | Không tìm thấy user |
| `PROFILE_NOT_FOUND` | 404 | Chưa tạo hồ sơ |
| `PROFILE_ALREADY_EXISTS` | 409 | Hồ sơ đã tồn tại |
| `PROFILE_INCOMPLETE` | 400 | Hồ sơ thiếu thông tin bắt buộc |
| `MATCHMAKING_ALREADY_IN_QUEUE` | 409 | Đang trong hàng đợi rồi |
| `MATCHMAKING_TIMEOUT` | 408 | Hết 5 phút chờ |
| `ROOM_NOT_FOUND` | 404 | Phòng không tồn tại hoặc đã đóng |
| `ROOM_FORBIDDEN` | 403 | Không phải participant của phòng |
| `CHAT_MODERATION_BLOCKED` | 400 | Tin nhắn vi phạm nội quy |
| `CHAT_SPAM_DETECTED` | 429 | Gửi tin quá nhanh |
| `CHAT_BLOCKED_BY_USER` | 403 | Người dùng đã block nhau |
| `UPLOAD_INVALID_FILE` | 400 | File không hợp lệ (sai định dạng) |
| `UPLOAD_TOO_LARGE` | 400 | File vượt quá kích thước cho phép |

> **Quy tắc bất biến:** Không đổi tên `code` đã release. Thêm code mới thay vì sửa code cũ.

---

## 4. Cách thêm exception mới

### Bước 1 — Thêm `ApiCode` (nếu chưa có)

```ts
// common/constants/api-code.enum.ts
export enum ApiCode {
  // ... existing ...
  PAYMENT_INSUFFICIENT_BALANCE = 'PAYMENT_INSUFFICIENT_BALANCE',
}
```

### Bước 2 — Tạo Typed Exception

```ts
// common/exceptions/payment.exceptions.ts
import { HttpStatus } from '@nestjs/common';
import { ApiCode } from '../constants/api-code.enum';
import { AppException } from './app.exception';

export class InsufficientBalanceException extends AppException {
  constructor() {
    super(
      {
        code: ApiCode.PAYMENT_INSUFFICIENT_BALANCE,
        message: 'Số dư không đủ để thực hiện giao dịch',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
```

### Bước 3 — Throw trong Service

```ts
// payment.service.ts
if (user.balance < amount) {
  throw new InsufficientBalanceException();
}
```

`HttpExceptionFilter` tự động bắt và trả response đúng format — **không cần thêm code nào vào filter**.

---

## 5. Thêm `errors[]` thủ công (không qua ValidationPipe)

```ts
import { HttpStatus } from '@nestjs/common';
import { ApiCode } from '../constants/api-code.enum';
import { AppException } from '../exceptions/app.exception';

throw new AppException(
  {
    code: ApiCode.VALIDATION_ERROR,
    message: 'Dữ liệu không hợp lệ',
    errors: [
      { field: 'startDate', message: 'startDate phải trước endDate' },
      { field: 'endDate',   message: 'endDate không được ở quá khứ' },
    ],
  },
  HttpStatus.BAD_REQUEST,
);
```

---

## 6. `requestId` — Kết nối log và response

Mỗi response lỗi có `requestId`. Header `X-Request-Id` cũng được gắn vào response HTTP.

**Dùng để debug:**
```bash
# Tìm log của một request cụ thể
grep "reqId=req_8af2c1de9012ab34" backend.log
```

**Client có thể gửi ID của riêng mình:**
```http
POST /api/auth/login
X-Request-Id: my-app-trace-abc123
```

Server sẽ dùng `my-app-trace-abc123` thay vì tự sinh — giúp correlate log từ cả client lẫn server.

---

## 7. Liên quan

| File | Vai trò |
|---|---|
| [`common/dto/api-error-response.dto.ts`](../backend/src/common/dto/api-error-response.dto.ts) | Swagger DTO của error response |
| [`common/interceptors/transform.interceptor.ts`](../backend/src/common/interceptors/transform.interceptor.ts) | Wrap response thành công (cùng shape) |
| [`common/filters/http-exception.filter.ts`](../backend/src/common/filters/http-exception.filter.ts) | Bắt và chuẩn hoá mọi exception |
| [`common/exceptions/app.exception.ts`](../backend/src/common/exceptions/app.exception.ts) | Base class cho exception nội bộ |
| [`common/exceptions/app.exceptions.ts`](../backend/src/common/exceptions/app.exceptions.ts) | Typed exceptions cho domain chung |
| [`common/exceptions/matchmaking.exceptions.ts`](../backend/src/common/exceptions/matchmaking.exceptions.ts) | Exceptions cho matchmaking |
| [`common/exceptions/profile.exceptions.ts`](../backend/src/common/exceptions/profile.exceptions.ts) | Exceptions cho profile |
| [`common/constants/api-code.enum.ts`](../backend/src/common/constants/api-code.enum.ts) | Enum tất cả mã lỗi/trạng thái |
| [`common/middleware/request-id.middleware.ts`](../backend/src/common/middleware/request-id.middleware.ts) | Sinh / nhận X-Request-Id |
