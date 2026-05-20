'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm';
import { useAuthStore } from '@/store/authStore';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { pendingEmail, user } = useAuthStore();

  // Nếu đã đăng nhập (xác thực xong), redirect
  useEffect(() => {
    if (user?.isEmailVerified) {
      router.replace('/matchmaking');
    }
  }, [user, router]);

  // Nếu không có email đang chờ xác thực, redirect về register
  if (!pendingEmail) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <p className="text-muted-foreground">Không tìm thấy email cần xác thực.</p>
        <a href="/register" className="text-primary hover:underline">
          Quay lại đăng ký
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Xác thực email</h1>
        <p className="text-sm text-muted-foreground">Nhập mã OTP được gửi đến hộp thư của bạn</p>
      </div>
      <VerifyEmailForm email={pendingEmail} />
    </div>
  );
}
