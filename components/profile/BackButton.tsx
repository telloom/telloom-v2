'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => router.push('/select-role')}
      className="flex items-center gap-2 text-muted-foreground hover:text-white rounded-full mb-6 hover:bg-[#8fbc55]"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Select Role
    </Button>
  );
} 