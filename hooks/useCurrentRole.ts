'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export type Role = 'SHARER' | 'LISTENER' | 'EXECUTOR' | null;

export function useCurrentRole(): Role {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<Role>(null);

  useEffect(() => {
    if (pathname?.includes('/role-sharer')) {
      setCurrentRole('SHARER');
    } else if (pathname?.includes('/role-listener')) {
      setCurrentRole('LISTENER');
    } else if (pathname?.includes('/role-executor')) {
      setCurrentRole('EXECUTOR');
    } else {
      setCurrentRole(null);
    }
  }, [pathname]);

  return currentRole;
} 