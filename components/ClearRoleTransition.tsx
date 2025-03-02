'use client';

import { useEffect } from 'react';

export default function ClearRoleTransition() {
  useEffect(() => {
    // Clear the role transition flag when this component mounts
    // This indicates that the role page has fully loaded
    if (typeof window !== 'undefined') {
      const isInTransition = localStorage.getItem('telloom_role_transition') === 'true';
      
      if (isInTransition) {
        console.log('[CLEAR_ROLE_TRANSITION] Clearing role transition flag');
        localStorage.removeItem('telloom_role_transition');
        localStorage.removeItem('telloom_transition_timestamp');
      }
    }
  }, []);
  
  // This component doesn't render anything
  return null;
} 