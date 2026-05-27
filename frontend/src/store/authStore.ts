import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/auth-api';
import { setAuthCookie, clearAuthCookie } from '@/lib/auth-cookie';
import type { User } from '@/types/user.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Email đang chờ xác thực OTP */
  pendingEmail: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, gender: string) => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setPendingEmail: (email: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      pendingEmail: null,

      register: async (email, password, displayName, gender) => {
        await authApi.register({ email, password, displayName, gender });
        set({ pendingEmail: email });
      },

      login: async (email, password) => {
        const res = await authApi.login({ email, password });
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        setAuthCookie(res.accessToken);
        set({ user: res.user as User, accessToken: res.accessToken, refreshToken: res.refreshToken });
      },

      verifyEmail: async (email, otp) => {
        const res = await authApi.verifyEmail({ email, otp });
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        setAuthCookie(res.accessToken);
        set({
          user: res.user as User,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          pendingEmail: null,
        });
      },

      resendOtp: async (email) => {
        await authApi.resendOtp(email);
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        clearAuthCookie();
        set({ user: null, accessToken: null, refreshToken: null, pendingEmail: null });
      },

      setUser: (user) => set({ user }),
      setPendingEmail: (email) => set({ pendingEmail: email }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        pendingEmail: state.pendingEmail,
      }),
    },
  ),
);
