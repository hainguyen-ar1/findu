export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar: string;
  role: 'user' | 'vip' | 'admin';
  isEmailVerified: boolean;
}
