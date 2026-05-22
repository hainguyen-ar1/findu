'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Mail, RefreshCw } from 'lucide-react';

const OTP_LENGTH = 6;

interface VerifyEmailFormProps {
  email: string;
}

export function VerifyEmailForm({ email }: VerifyEmailFormProps) {
  const router = useRouter();
  const { verifyEmail, resendOtp } = useAuthStore();
  const { toast } = useToast();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Countdown đếm ngược cho phép resend OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    // Chỉ chấp nhận số
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto-focus ô tiếp theo
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Tự động submit khi đủ 6 số
    if (newDigits.every((d) => d !== '') && newDigits.filter((d) => d).length === OTP_LENGTH) {
      handleSubmit(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const newDigits = paste.split('').concat(Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH);
    setDigits(newDigits);
    if (paste.length === OTP_LENGTH) {
      handleSubmit(paste);
    }
  };

  const handleSubmit = async (code: string) => {
    if (isSubmitting || code.length !== OTP_LENGTH) return;
    setIsSubmitting(true);
    try {
      await verifyEmail(email, code);
      toast({ title: 'Email đã được xác thực!', description: 'Chào mừng bạn đến StrangerConfide.' });
      router.push('/matchmaking');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Xác thực thất bại',
        description: err.message || 'Mã OTP không đúng hoặc đã hết hạn',
      });
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (isResending || countdown > 0) return;
    setIsResending(true);
    try {
      await resendOtp(email);
      setCountdown(60);
      toast({ title: 'OTP đã được gửi lại', description: 'Kiểm tra hộp thư của bạn.' });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Gửi OTP thất bại',
        description: err.message,
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Icon + mô tả */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Chúng tôi đã gửi mã 6 số đến</p>
          <p className="font-semibold">{email}</p>
        </div>
      </div>

      {/* OTP inputs */}
      <div className="flex justify-center gap-3" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`OTP digit ${i + 1}`}
            className={`
              h-14 w-12 rounded-lg border text-center text-xl font-bold
              bg-background transition-all duration-150
              focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30
              ${digit ? 'border-primary text-primary' : 'border-border'}
            `}
          />
        ))}
      </div>

      {/* Submit manual */}
      <Button
        className="w-full"
        disabled={isSubmitting || digits.some((d) => !d)}
        onClick={() => handleSubmit(digits.join(''))}
      >
        {isSubmitting ? 'Đang xác thực...' : 'Xác thực'}
      </Button>

      {process.env.NODE_ENV === 'development' && (
        <p className="text-center text-xs text-muted-foreground">
          Dev: nhập <span className="font-mono font-semibold">000000</span> để bỏ qua OTP
        </p>
      )}

      {/* Resend */}
      <div className="text-center text-sm text-muted-foreground">
        Không nhận được mã?{' '}
        {countdown > 0 ? (
          <span className="text-primary">Gửi lại sau {countdown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
            Gửi lại OTP
          </button>
        )}
      </div>
    </div>
  );
}
