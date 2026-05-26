'use client';

import { useState, useRef } from 'react';
import { Send, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onSend: (content: string) => void;
  onSendImage: (file: File) => Promise<void>;
  onTyping: () => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onSendImage, onTyping, disabled }: Props) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      await onSendImage(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="safe-bottom shrink-0 border-t border-border/60 bg-card/80 p-3 backdrop-blur-md">
      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || disabled}
          title="Gửi ảnh"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImageIcon className="h-5 w-5" />
          )}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />

        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Cuộc trò chuyện đã kết thúc' : 'Nhập tin nhắn...'}
          className="min-h-[44px] flex-1 rounded-2xl border-border/60 bg-background"
          maxLength={1000}
          disabled={disabled}
        />

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="h-11 w-11 shrink-0 rounded-full"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        Ảnh và tin nhắn được kiểm duyệt tự động
      </p>
    </div>
  );
}
