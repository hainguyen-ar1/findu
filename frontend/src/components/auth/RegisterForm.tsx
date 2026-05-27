'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
] as const;

const schema = z
  .object({
    displayName: z.string().min(2, 'Tên ít nhất 2 ký tự').max(30),
    email: z.string().email('Email không hợp lệ'),
    gender: z.enum(['male', 'female', 'other'], { required_error: 'Vui lòng chọn giới tính' }),
    password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser } = useAuthStore();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(data.email, data.password, data.displayName, data.gender);
      toast({
        title: 'Đăng ký thành công!',
        description: 'Kiểm tra email để lấy mã OTP xác thực.',
      });
      router.push('/verify-email');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Đăng ký thất bại',
        description: err.message || 'Có lỗi xảy ra, vui lòng thử lại',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">Tên hiển thị</Label>
        <Input id="displayName" placeholder="Tên của bạn" {...register('displayName')} />
        {errors.displayName && (
          <p className="text-xs text-destructive">{errors.displayName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Giới tính</Label>
        <div className="flex gap-2">
          {GENDER_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
            >
              <input
                type="radio"
                value={opt.value}
                {...register('gender')}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {errors.gender && (
          <p className="text-xs text-destructive">{errors.gender.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-email">Email</Label>
        <Input id="reg-email" type="email" placeholder="ban@example.com" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password">Mật khẩu</Label>
        <Input id="reg-password" type="password" placeholder="••••••••" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
