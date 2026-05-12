'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMatchmaking } from '@/hooks/useMatchmaking';

export function MatchmakingPanel() {
  const router = useRouter();
  const { isInQueue, position, joinQueue, leaveQueue } = useMatchmaking();
  const [preference, setPreference] = useState<'any' | 'opposite' | 'same'>('any');

  const handleMatchFound = (roomId: string) => {
    router.push(`/chat/${roomId}`);
  };

  return (
    <div className="w-full max-w-md space-y-8 text-center">
      <div>
        <div className="mb-4 flex justify-center">
          <div className="rounded-2xl bg-primary/10 p-5">
            <Users className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Tìm người tâm sự</h1>
        <p className="mt-2 text-muted-foreground">
          Chúng tôi sẽ ghép bạn với một người lạ ngẫu nhiên
        </p>
      </div>

      {!isInQueue ? (
        <div className="space-y-4">
          <div className="text-left">
            <label className="mb-2 block text-sm font-medium">Muốn chat với</label>
            <select
              value={preference}
              onChange={(e) => setPreference(e.target.value as typeof preference)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="any">Bất kỳ ai</option>
              <option value="opposite">Giới tính ngược lại</option>
              <option value="same">Cùng giới tính</option>
            </select>
          </div>

          <Button
            size="lg"
            className="w-full rounded-full"
            onClick={() => joinQueue({ preference }, handleMatchFound)}
          >
            Tìm người tâm sự
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-medium">Đang tìm kiếm...</p>
            {position > 0 && (
              <p className="text-sm text-muted-foreground">Vị trí trong hàng đợi: #{position}</p>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={leaveQueue}>
            Huỷ tìm kiếm
          </Button>
        </div>
      )}
    </div>
  );
}
