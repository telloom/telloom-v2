'use client';

import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function SuccessToast() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  useEffect(() => {
    if (message) {
      console.log('Showing toast with message:', message); // Debug log
      toast.success(message, {
        duration: 4000,
        important: true,
      });
    }
  }, [message]);

  return null;
} 