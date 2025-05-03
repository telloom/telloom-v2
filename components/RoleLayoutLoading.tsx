'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';

export default function RoleLayoutLoading() {
  const [shouldShow, setShouldShow] = useState(false);
  
  useEffect(() => {
    // Check if we're in a role transition
    const isInTransition = localStorage.getItem('telloom_role_transition') === 'true';
    const transitionTimestamp = localStorage.getItem('telloom_transition_timestamp');
    
    // If we're in a transition, don't show this loading component
    if (isInTransition) {
      console.log('[ROLE_LAYOUT_LOADING] In transition, not showing loading state');
      
      // If the transition has been active for more than 5 seconds, clear it
      // This prevents the flag from getting stuck if something goes wrong
      if (transitionTimestamp) {
        const timestamp = parseInt(transitionTimestamp, 10);
        const now = Date.now();
        if (now - timestamp > 5000) {
          console.log('[ROLE_LAYOUT_LOADING] Clearing stale transition state');
          localStorage.removeItem('telloom_role_transition');
          localStorage.removeItem('telloom_transition_timestamp');
          setShouldShow(true);
        }
      }
      
      return;
    }
    
    // If we're not in a transition, show this loading component
    setShouldShow(true);
  }, []);
  
  // Don't render anything if we shouldn't show
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center">
      <div className="w-full max-w-6xl px-4 py-6 md:py-8">
        <div className="w-full text-center">
          <div className="mb-8">
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