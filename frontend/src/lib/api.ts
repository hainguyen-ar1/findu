import axios, { AxiosError, AxiosResponse } from 'axios';
import { setAuthCookie, clearAuthCookie } from './auth-cookie';
import { ApiError, ApiResponse } from '@/types/api.types';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

// ─── Request interceptor: gắn JWT ──────────────────────────────────────────

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Response interceptor: unwrap data + auto refresh ──────────────────────

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  // Unwrap `data` — giữ tương thích với code cũ.
  // Nếu cần truy cập meta/requestId, dùng axios raw response qua apiClient.request.
  ((res: AxiosResponse<ApiResponse<unknown>>) => {
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body) {
      return body.data as unknown as AxiosResponse;
    }
    return body as unknown as AxiosResponse;
  }) as never,

  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as any;

    // Nếu 401 và chưa retry, thử refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/auth/refresh`,
          { refreshToken },
        );
        const newTokens = res.data?.data!;

        localStorage.setItem('accessToken', newTokens.accessToken);
        localStorage.setItem('refreshToken', newTokens.refreshToken);
        setAuthCookie(newTokens.accessToken);

        processQueue(null, newTokens.accessToken);
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        clearAuthCookie();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(toApiError(error));
  },
);

function toApiError(error: AxiosError<ApiResponse<unknown>>): ApiError {
  const body = error.response?.data;
  if (body && typeof body === 'object' && 'code' in body && 'message' in body) {
    return new ApiError({
      statusCode: body.statusCode ?? error.response?.status ?? 500,
      code: body.code,
      message: body.message,
      errors: body.errors ?? null,
      requestId: body.requestId,
      path: body.path,
    });
  }
  return new ApiError({
    statusCode: error.response?.status ?? 0,
    code: 'NETWORK_ERROR',
    message: error.message || 'Có lỗi xảy ra',
  });
}
