'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { chatApi } from '@/lib/chat-api';
import type { ReportReason } from '@/types/chat.types';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam / quảng cáo' },
  { value: 'harassment', label: 'Quấy rối' },
  { value: 'inappropriate_content', label: 'Nội dung không phù hợp' },
  { value: 'personal_info', label: 'Lộ thông tin cá nhân' },
  { value: 'other', label: 'Khác' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  roomId: string;
  reportedUserId: string;
}

export function ReportDialog({ open, onClose, roomId, reportedUserId }: Props) {
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await chatApi.report({ reportedUserId, roomId, reason, description });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gửi báo cáo thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Báo cáo người dùng</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {done ? (
          <p className="text-sm text-muted-foreground">
            Đã ghi nhận báo cáo. Cảm ơn bạn đã giúp cộng đồng an toàn hơn.
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              Báo cáo được xử lý bảo mật. Thông tin ẩn danh của bạn không bị lộ.
            </p>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-primary"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea
              className="mt-3 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              rows={3}
              placeholder="Mô tả thêm (tuỳ chọn)"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <Button className="mt-4 w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
