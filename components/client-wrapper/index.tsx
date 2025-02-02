/**
 * File: components/client-wrapper/index.tsx
 * Description: Barrel file for client-side wrapper components
 */

'use client';

import { useEffect, useState } from 'react';

interface ClientFormWrapperProps {
  children: React.ReactNode;
}

export function ClientFormWrapper({ children }: ClientFormWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render children after component has mounted on the client
  if (!mounted) {
    return <div className="animate-pulse" />;
  }

  return <>{children}</>;
} 