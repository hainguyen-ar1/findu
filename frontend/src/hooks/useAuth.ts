'use client';

import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, accessToken, login, register, logout } = useAuthStore();
  return {
    user,
    isAuthenticated: !!accessToken,
    login,
    register,
    logout,
  };
}
