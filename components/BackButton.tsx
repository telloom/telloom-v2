// components/BackButton.tsx
// A reusable back button component that navigates to the previous page or a specified route

'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface BackButtonProps {
  href: string;
  label: string;
}

export default function BackButton({ href, label }: BackButtonProps) {
  return (
    <Button
      variant="ghost"
      asChild
      className="-ml-2 text-muted-foreground hover:text-[#1B4332] rounded-full"
    >
      <Link href={href}>
        <ChevronLeft className="h-4 w-4 mr-1" />
        {label}
      </Link>
    </Button>
  );
} 