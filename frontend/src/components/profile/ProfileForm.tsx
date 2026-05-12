'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';

const schema = z.object({
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Chọn giới tính' }),
  age: z.coerce.number().min(13, 'Tuổi tối thiểu 13').max(99),
  bio: z.string().max(200).optional(),
  chatPreference: z.enum(['opposite', 'same', 'any']).default('any'),
});

type FormData = z.infer<typeof schema>;

export function ProfileForm() {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await apiClient.put('/profile', data);
      toast({ title: 'Đã lưu hồ sơ' });
    } catch {
      toast({ variant: 'destructive', title: 'Lưu thất bại' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-xl border p-6">
      <div className="space-y-2">
        <Label>Giới tính</Label>
        <select
          {...register('gender')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">-- Chọn giới tính --</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="other">Khác</option>
        </select>
        {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="age">Tuổi</Label>
        <Input id="age" type="number" min={13} max={99} {...register('age')} />
        {errors.age && <p className="text-xs text-destructive">{errors.age.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Giới thiệu bản thân (tuỳ chọn)</Label>
        <textarea
          id="bio"
          {...register('bio')}
          rows={3}
          maxLength={200}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Một vài điều về bạn..."
        />
      </div>

      <div className="space-y-2">
        <Label>Muốn chat với</Label>
        <select
          {...register('chatPreference')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="any">Bất kỳ ai</option>
          <option value="opposite">Giới tính ngược lại</option>
          <option value="same">Cùng giới tính</option>
        </select>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Đang lưu...' : 'Lưu hồ sơ'}
      </Button>
    </form>
  );
}
