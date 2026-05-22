'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Flag, Ban, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { ReportDialog } from './ReportDialog';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

interface Props {
  roomId: string;
}

export function ChatRoom({ roomId }: Props) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);

  const {
    messages,
    isPartnerTyping,
    myAlias,
    partnerAlias,
    myAvatar,
    partnerAvatar,
    partnerOnline,
    partnerUserId,
    error,
    sendMessage,
    sendImage,
    leaveRoom,
    blockPartner,
    onTyping,
  } = useChat(roomId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  const handleLeave = () => {
    leaveRoom();
    router.push('/matchmaking');
  };

  const handleBlock = () => {
    blockPartner();
    setBlockConfirm(false);
    router.push('/matchmaking');
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col bg-background">
      {/* Header */}
      <header className="safe-top flex shrink-0 items-center justify-between border-b border-border/60 bg-card/80 px-3 py-3 backdrop-blur-md sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          {partnerAvatar ? (
            <img
              src={partnerAvatar}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full border-2 border-border object-cover"
            />
          ) : (
            <div className="h-11 w-11 shrink-0 rounded-full bg-muted" />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{partnerAlias || 'Stranger'}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  partnerOnline ? 'bg-emerald-500' : 'bg-muted-foreground/50',
                )}
              />
              {partnerOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'}
              <span className="mx-1">·</span>
              <Shield className="inline h-3 w-3" />
              Ẩn danh
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {partnerUserId && (
            <Button
              variant="ghost"
              size="icon"
              title="Báo cáo"
              onClick={() => setReportOpen(true)}
            >
              <Flag className="h-4 w-4" />
            </Button>
          )}
          {partnerUserId && (
            <Button
              variant="ghost"
              size="icon"
              title="Chặn"
              onClick={() => setBlockConfirm(true)}
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleLeave} title="Rời phòng">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {error && (
        <div className="bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            {myAvatar && (
              <img src={myAvatar} alt="" className="mb-3 h-16 w-16 rounded-full opacity-60" />
            )}
            <p className="text-sm">Bạn là {myAlias || 'Stranger'}</p>
            <p className="mt-1 max-w-xs text-xs">
              Hãy bắt đầu trò chuyện. Tin nhắn không được lưu sau khi rời phòng.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id || `${msg.senderAlias}-${msg.createdAt}`} message={msg} isOwn={msg.senderAlias === myAlias} />
        ))}
        {isPartnerTyping && <TypingIndicator alias={partnerAlias || 'Stranger'} />}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSend={sendMessage} onSendImage={sendImage} onTyping={onTyping} />

      {partnerUserId && (
        <ReportDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          roomId={roomId}
          reportedUserId={partnerUserId}
        />
      )}

      {blockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-5">
            <h3 className="font-semibold">Chặn người này?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Họ sẽ không thể ghép đôi với bạn nữa. Phòng chat sẽ đóng ngay.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setBlockConfirm(false)}>
                Huỷ
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleBlock}>
                Chặn
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
