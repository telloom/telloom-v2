'use client';

/**
 * components/ui/BackButton.tsx
 * A reusable client component button that navigates back one step in the browser history.
 */
import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode; // Allow custom text
}

export function BackButton({ 
  className,
  variant = "ghost",
  size = "sm",
  children = "Back"
}: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => router.back()}
      className={cn("rounded-full", className)}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {children}
    </Button>
  );
} 