import { ChatRoom } from '@/components/chat/ChatRoom';

interface Props {
  params: Promise<{ roomId: string }>;
}

export default async function ChatRoomPage({ params }: Props) {
  const { roomId } = await params;
  return <ChatRoom roomId={roomId} />;
}
