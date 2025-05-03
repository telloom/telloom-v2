import Image from 'next/image';
import Logo from '@/components/Logo';

export default function RoleExecutorLoading() {
  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center">
      <div className="w-full max-w-6xl px-4 py-6 md:py-8">
        <div className="w-full text-center">
          <div className="mx-auto mb-6">
            <Logo />
          </div>
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1B4332] border-t-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
} 