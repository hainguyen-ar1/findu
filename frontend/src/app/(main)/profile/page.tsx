import { ProfileForm } from '@/components/profile/ProfileForm';

export default function ProfilePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Hồ sơ của bạn</h1>
        <p className="text-muted-foreground">Cài đặt thông tin trước khi tìm kiếm</p>
      </div>
      <ProfileForm />
    </div>
  );
}
