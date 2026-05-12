import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-primary/5 p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <MessageCircle className="h-6 w-6 text-primary" />
          StrangerConfide
        </Link>
        <blockquote className="space-y-2">
          <p className="text-lg italic text-muted-foreground">
            "Đôi khi, một người lạ lắng nghe bạn tốt hơn bất kỳ ai quen biết."
          </p>
        </blockquote>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">{children}</div>
    </div>
  );
}
