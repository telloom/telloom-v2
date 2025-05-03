'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function ShowStatusMessages() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get('message');
    const error = searchParams.get('error');

    if (message) {
      toast.success(message);
      // Clean the URL query params without reloading the page
      const currentPath = window.location.pathname;
      window.history.replaceState({}, '', currentPath);
    }
    if (error) {
      toast.error(error);
      const currentPath = window.location.pathname;
      window.history.replaceState({}, '', currentPath);
    }
  }, [searchParams]); // Re-run only if searchParams change

  // This component doesn't render anything itself
  return null;
} 