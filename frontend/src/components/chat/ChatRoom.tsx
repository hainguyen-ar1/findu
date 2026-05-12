'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { useChat } from '@/hooks/useChat';

interface Props {
  roomId: string;
}

export function ChatRoom({ roomId }: Props) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isPartnerTyping, myAlias, partnerAlias, sendMessage, leaveRoom } = useChat(roomId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLeave = () => {
    leaveRoom();
    router.push('/matchmaking');
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="font-semibold">{partnerAlias || 'Stranger'}</p>
          <p className="text-xs text-muted-foreground">Ẩn danh · Không lưu lịch sử</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" title="Báo cáo">
            <Flag className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLeave} title="Rời phòng">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} isOwn={msg.senderAlias === myAlias} />
        ))}
        {isPartnerTyping && <TypingIndicator alias={partnerAlias || 'Stranger'} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
