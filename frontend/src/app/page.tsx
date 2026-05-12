import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageCircle, Shield, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 px-4">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-2xl bg-primary/10 p-4">
            <MessageCircle className="h-12 w-12 text-primary" />
          </div>
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-6xl">
          StrangerConfide
        </h1>
        <p className="mb-2 text-xl text-muted-foreground">Tâm sự với người lạ</p>
        <p className="mb-10 text-muted-foreground">
          Kết nối ẩn danh, lắng nghe an toàn. Tìm một người lạ để chia sẻ những điều chưa
          nói được với ai.
        </p>

        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/register">Bắt đầu ngay</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-8">
            <Link href="/login">Đăng nhập</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: Shield,
              title: 'An toàn tuyệt đối',
              desc: 'Ẩn danh hoàn toàn, không lưu lịch sử chat',
            },
            {
              icon: Zap,
              title: 'Ghép đôi nhanh',
              desc: 'Tìm người tâm sự chỉ trong vài giây',
            },
            {
              icon: MessageCircle,
              title: 'Real-time',
              desc: 'Chat trực tiếp, typing indicator, gửi ảnh',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur"
            >
              <Icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="mb-1 font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
