'use client';

import Image from 'next/image';
import { User, Mail, Cake, Users } from 'lucide-react';
import type { ProfileData } from '@/lib/profile-api';
import { getAvatarUrl } from '@/lib/profile-api';

const GENDER_LABEL: Record<string, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};

const PREFERENCE_LABEL: Record<string, string> = {
  any: 'Bất kỳ ai',
  opposite: 'Giới tính ngược lại',
  same: 'Cùng giới tính',
};

interface Props {
  data: ProfileData;
}

export function ProfileView({ data }: Props) {
  const { user, profile, isComplete } = data;
  const avatarSrc = getAvatarUrl(profile?.avatar || user.avatar);

  return (
    <Wrapper className="space-y-6">
      <Wrapper className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-start">
        <Wrapper className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
          {avatarSrc ? (
            <Image src={avatarSrc} alt={user.displayName} fill className="object-cover" unoptimized />
          ) : (
            <Wrapper className="flex h-full w-full items-center justify-center">
              <User className="h-10 w-10 text-muted-foreground" />
            </Wrapper>
          )}
        </Wrapper>
        <Wrapper className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold">{user.displayName}</h2>
          <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground sm:justify-start">
            <Mail className="h-3.5 w-3.5" />
            {user.email}
          </p>
          {!isComplete && (
            <p className="mt-2 inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-600 dark:text-amber-400">
              Hồ sơ chưa hoàn thiện — cần điền giới tính và tuổi để tìm người tâm sự
            </p>
          )}
        </Wrapper>
      </Wrapper>

      {profile ? (
        <Wrapper className="grid gap-4 rounded-xl border p-6 sm:grid-cols-2">
          <InfoRow icon={<User className="h-4 w-4" />} label="Giới tính" value={GENDER_LABEL[profile.gender] || profile.gender} />
          <InfoRow icon={<Cake className="h-4 w-4" />} label="Tuổi" value={`${profile.age} tuổi`} />
          <InfoRow
            icon={<Users className="h-4 w-4" />}
            label="Muốn chat với"
            value={PREFERENCE_LABEL[profile.chatPreference] || profile.chatPreference}
          />
          {profile.preferredGender && (
            <InfoRow
              icon={<Users className="h-4 w-4" />}
              label="Giới tính ưu tiên"
              value={GENDER_LABEL[profile.preferredGender]}
            />
          )}
          {profile.bio && (
            <Wrapper className="sm:col-span-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Giới thiệu</p>
              <p className="text-sm">{profile.bio}</p>
            </Wrapper>
          )}
        </Wrapper>
      ) : (
        <Wrapper className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Chưa có hồ sơ chi tiết. Nhấn &quot;Chỉnh sửa&quot; để tạo.
        </Wrapper>
      )}
    </Wrapper>
  );
}

function Wrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Wrapper className="flex items-start gap-3">
      <Wrapper className="mt-0.5 text-primary">{icon}</Wrapper>
      <Wrapper>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </Wrapper>
    </Wrapper>
  );
}
