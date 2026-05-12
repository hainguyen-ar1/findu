import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api';
import type { User } from '@/types/user.types';
import type { AuthResponse } from '@/types/api.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,

      login: async (email, password) => {
        const res = await apiClient.post<any, AuthResponse>('/auth/login', { email, password });
        localStorage.setItem('accessToken', res.accessToken);
        set({ user: res.user as User, accessToken: res.accessToken });
      },

      register: async (email, password, displayName) => {
        const res = await apiClient.post<any, AuthResponse>('/auth/register', {
          email,
          password,
          displayName,
        });
        localStorage.setItem('accessToken', res.accessToken);
        set({ user: res.user as User, accessToken: res.accessToken });
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    },
  ),
);
