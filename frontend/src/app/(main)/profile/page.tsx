'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { ProfileView } from '@/components/profile/ProfileView';
import { profileApi, type ProfileData } from '@/lib/profile-api';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { toast } = useToast();
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await profileApi.get();
      setData(result);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Không tải được hồ sơ',
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8 text-center text-muted-foreground">
        Không thể tải hồ sơ. Vui lòng đăng nhập lại.
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hồ sơ của bạn</h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Chỉnh sửa thông tin cá nhân' : 'Xem và quản lý hồ sơ'}
          </p>
        </div>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
            <Pencil className="h-4 w-4" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      {isEditing ? (
        <ProfileForm
          initialData={data}
          onSaved={(updated) => {
            setData(updated);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ProfileView data={data} />
      )}
    </div>
  );
}
