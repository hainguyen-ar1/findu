import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/chat.types';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: Props) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
          isOwn
            ? 'rounded-tr-sm bg-primary text-primary-foreground'
            : 'rounded-tl-sm bg-muted text-foreground',
        )}
      >
        {!isOwn && (
          <p className="mb-1 text-xs font-medium text-muted-foreground">{message.senderAlias}</p>
        )}
        {message.type === 'image' && message.imageUrl ? (
          <img
            src={message.imageUrl}
            alt="Ảnh"
            className="max-h-60 rounded-lg object-contain"
          />
        ) : (
          <p className="break-words">{message.content}</p>
        )}
      </div>
    </div>
  );
}
