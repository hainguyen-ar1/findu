export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
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
