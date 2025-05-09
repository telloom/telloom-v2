'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Headphones, Share2, UserCog, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Logo from '@/components/Logo';

type Role = 'LISTENER' | 'SHARER' | 'EXECUTOR';

interface RoleInfo {
  role: Role;
  title: string;
  description: string;
  icon: React.ElementType;
}

const ROLES: RoleInfo[] = [
  {
    role: 'LISTENER',
    title: 'Listener',
    description: 'Celebrate, remember, and learn from your loved ones and previous generations.',
    icon: Headphones,
  },
  {
    role: 'SHARER',
    title: 'Sharer',
    description: 'Record and share your life stories, facts, and wisdom for future generations.',
    icon: Share2,
  },
  {
    role: 'EXECUTOR',
    title: 'Executor',
    description: 'Manage a Sharer\'s content and listeners, preserving their legacy.',
    icon: UserCog,
  },
];

export default function SelectRoleClient() {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();

  // Prefetch all possible role pages to make transitions faster
  useEffect(() => {
    router.prefetch('/role-listener');
    router.prefetch('/role-sharer');
    router.prefetch('/role-executor');
  }, [router]);

  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoadingRoles(true);
      setError(null);
      try {
        const response = await fetch('/api/select-role');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch roles');
        }
        const data = await response.json();
        setAvailableRoles(data.roles || []);
      } catch (error) {
        console.error('Error fetching roles:', error);
        setError('Failed to load available roles. Please try refreshing the page.');
        toast.error('Failed to load available roles');
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleSelectRole = async (role: Role) => {
    if (isTransitioning) return;
    
    setSelectedRole(role);
    setIsTransitioning(true);
    setError(null);
    
    try {
      console.log(`[SELECT_ROLE] Starting role transition to ${role}`);
      
      // Set transition flags in localStorage for UI state
      if (typeof window !== 'undefined') {
        localStorage.setItem('telloom_role_transition', 'true');
        localStorage.setItem('telloom_transition_timestamp', Date.now().toString());
      }
      
      // First, call the API to set the activeRole cookie server-side
      console.log(`[SELECT_ROLE] Setting cookie via API for role: ${role}`);
      const response = await fetch('/api/select-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to select role');
      }
      
      // Get the redirectUrl from the API response
      const data = await response.json();
      const targetUrl = data.redirectUrl || `/role-${role.toLowerCase()}`;
      
      console.log(`[SELECT_ROLE] API call successful, navigating to ${targetUrl}`);
      
      // Force a full page navigation to ensure cookie is applied properly
      // This ensures consistent behavior across all role types
      // Important: using document.location (not window.location) for most reliable navigation
      console.log(`[SELECT_ROLE] Performing hard navigation to: ${targetUrl}`);
      document.location.href = targetUrl;
      
    } catch (error) {
      console.error('Error selecting role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to select role';
      setError(errorMessage);
      toast.error(errorMessage);
      setSelectedRole(null);
      setIsTransitioning(false);
      
      // Clear transition flags
      if (typeof window !== 'undefined') {
        localStorage.removeItem('telloom_role_transition');
        localStorage.removeItem('telloom_transition_timestamp');
      }
    }
  };

  // Full-screen loading overlay when transitioning
  if (isTransitioning) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
        <div className="mb-8">
          <Logo />
        </div>
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#1B4332] border-t-transparent" />
          <p className="text-lg text-[#1B4332]">
            {selectedRole ? `Switching to ${selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()} mode...` : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while fetching available roles
  if (isLoadingRoles) {
    return (
      <div className="w-full h-[50vh] flex flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#1B4332] border-t-transparent" />
        <p className="text-lg text-[#1B4332] mt-4">Loading available roles...</p>
      </div>
    );
  }

  // Show error state with retry button
  if (error) {
    return (
      <div className="w-full h-[50vh] flex flex-col items-center justify-center space-y-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleRetry} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full text-center">
      <div className="space-y-2 mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold">Select Your Role</h1>
        <p className="text-muted-foreground">Choose how you want to use Telloom</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {ROLES.map(({ role, title, description, icon: Icon }) => {
          const isAvailable = availableRoles.includes(role);
          
          return (
            <Card
              key={role}
              className={`p-4 md:p-6 space-y-4 text-center transition-all duration-300 border-2 border-[#1B4332] 
                ${isAvailable 
                  ? 'cursor-pointer shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55]' 
                  : 'opacity-50 cursor-not-allowed'
                }`}
              onClick={() => isAvailable && !isTransitioning && handleSelectRole(role)}
            >
              <div className="flex justify-center">
                <Icon className="h-10 w-10 md:h-12 md:w-12 text-[#1B4332]" />
              </div>
              <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
              <p className="text-sm md:text-base text-muted-foreground">{description}</p>
              {!isAvailable && (
                <div className="text-xs text-muted-foreground mt-2">
                  Role not available
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
} 