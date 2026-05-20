'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Loader2, Clock, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import { useToast } from '@/hooks/use-toast';
import type { ChatPreference, Gender } from '@/lib/profile-api';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MatchmakingPanel() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    isInQueue,
    position,
    queueSize,
    waitSeconds,
    expiresInSeconds,
    error,
    joinQueue,
    leaveQueue,
  } = useMatchmaking();

  const [preference, setPreference] = useState<ChatPreference>('any');
  const [preferredGender, setPreferredGender] = useState<Gender | ''>('');
  const [isJoining, setIsJoining] = useState(false);

  const handleSearch = async () => {
    setIsJoining(true);
    try {
      await joinQueue(
        {
          preference,
          ...(preferredGender ? { preferredGender } : {}),
        },
        (roomId) => {
          toast({ title: 'Đã tìm thấy người tâm sự!' });
          router.push(`/chat/${roomId}`);
        },
      );
    } catch (err: any) {
      if (err.message?.includes('Hồ sơ chưa hoàn thiện')) {
        toast({
          variant: 'destructive',
          title: 'Chưa đủ điều kiện',
          description: err.message,
        });
        router.push('/profile');
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Không thể tìm kiếm',
        description: err.message,
      });
    } finally {
      setIsJoining(false);
    }
  };

  const selectClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="w-full max-w-md space-y-8 text-center">
      <PanelHeader />

      {!isInQueue ? (
        <div className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-sm font-medium">Muốn chat với</label>
            <select
              value={preference}
              onChange={(e) => setPreference(e.target.value as ChatPreference)}
              className={selectClass}
            >
              <option value="any">Bất kỳ ai (Any)</option>
              <option value="opposite">Giới tính ngược lại (Opposite)</option>
              <option value="same">Cùng giới tính (Same)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Giới tính đối phương (tuỳ chọn)</label>
            <select
              value={preferredGender}
              onChange={(e) => setPreferredGender(e.target.value as Gender | '')}
              className={selectClass}
            >
              <option value="">Bất kỳ</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            size="lg"
            className="w-full rounded-full"
            onClick={handleSearch}
            disabled={isJoining}
          >
            {isJoining ? 'Đang kết nối...' : 'Tìm người tâm sự'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            <Link href="/profile" className="text-primary hover:underline">
              Cập nhật hồ sơ
            </Link>{' '}
            trước khi tìm kiếm (cần giới tính & tuổi)
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="h-14 w-14 animate-spin text-primary" />
              <Users className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">Đang tìm người tâm sự...</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Hệ thống ghép theo FIFO — ưu tiên người chờ lâu nhất
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card/50 p-4">
            <Stat icon={<Hash className="h-4 w-4" />} label="Vị trí chờ" value={`#${position}`} />
            <Stat
              icon={<Users className="h-4 w-4" />}
              label="Đang chờ"
              value={`${queueSize} người`}
            />
            <Stat
              icon={<Clock className="h-4 w-4" />}
              label="Đã chờ"
              value={formatTime(waitSeconds)}
            />
            <Stat
              icon={<Clock className="h-4 w-4" />}
              label="Còn lại"
              value={formatTime(expiresInSeconds)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button variant="outline" className="w-full" onClick={leaveQueue}>
            Huỷ tìm kiếm
          </Button>
        </div>
      )}
    </div>
  );
}

function PanelHeader() {
  return (
    <div>
      <div className="mb-4 flex justify-center">
        <div className="rounded-2xl bg-primary/10 p-5">
          <Users className="h-10 w-10 text-primary" />
        </div>
      </div>
      <h1 className="text-2xl font-bold">Tìm người tâm sự</h1>
      <p className="mt-2 text-muted-foreground">
        Ghép đôi ẩn danh với người lạ phù hợp preference của bạn
      </p>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}</div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
