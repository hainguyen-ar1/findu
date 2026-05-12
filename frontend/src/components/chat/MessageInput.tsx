'use client';

import { useState, useRef } from 'react';
import { Send, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onSend: (content: string, type?: 'text' | 'image') => void;
}

export function MessageInput({ onSend }: Props) {
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileRef.current?.click()}
          title="Gửi ảnh"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" />

        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          className="flex-1 rounded-full"
          maxLength={1000}
        />

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!text.trim()}
          className="rounded-full"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
