import { LoginForm } from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Chào mừng trở lại</h1>
        <p className="text-sm text-muted-foreground">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
