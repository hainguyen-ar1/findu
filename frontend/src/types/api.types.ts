export interface FieldError {
  field: string;
  message: string;
}

/** Shape response chuẩn từ backend (cả success + error) */
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  code: string;
  message: string;
  data: T | null;
  errors: FieldError[] | null;
  meta: Record<string, unknown> | null;
  requestId: string;
  path: string;
  timestamp: string;
}

/** Lỗi đã được normalize ở client — throw ra từ apiClient */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly errors: FieldError[] | null;
  readonly requestId: string;
  readonly path: string;

  constructor(payload: {
    statusCode: number;
    code: string;
    message: string;
    errors?: FieldError[] | null;
    requestId?: string;
    path?: string;
  }) {
    super(payload.message);
    this.name = 'ApiError';
    this.statusCode = payload.statusCode;
    this.code = payload.code;
    this.errors = payload.errors ?? null;
    this.requestId = payload.requestId ?? '';
    this.path = payload.path ?? '';
  }
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatar: string;
  };
}

export interface UserProfile {
  userId: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  bio: string;
  avatar: string;
  chatPreference: 'opposite' | 'same' | 'any';
  isVip: boolean;
}
