// components/BackButton.tsx
// A reusable back button component that navigates to the previous page or a specified route

'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  href?: string;
  className?: string;
}

export default function BackButton({ href, className = '' }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`gap-2 mb-4 hover:bg-transparent hover:text-[#1B4332] ${className}`}
      onClick={handleClick}
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </Button>
  );
} 