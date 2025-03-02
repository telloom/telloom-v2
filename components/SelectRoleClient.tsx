'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Headphones, Share2, UserCog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';

type Role = 'LISTENER' | 'SHARER' | 'EXECUTOR';

interface RoleInfo {
  role: Role;
  title: string;
  description: string;
  icon: React.ElementType;
}

interface SelectRoleClientProps {
  userId?: string; // Optional to maintain backward compatibility
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

export default function SelectRoleClient({ userId }: SelectRoleClientProps) {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
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
      try {
        const response = await fetch('/api/select-role');
        if (!response.ok) {
          throw new Error('Failed to fetch roles');
        }
        const data = await response.json();
        setAvailableRoles(data.roles || []);
      } catch (error) {
        console.error('Error fetching roles:', error);
        toast.error('Failed to load available roles');
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const handleSelectRole = async (role: Role) => {
    if (isTransitioning) return;
    
    // Set transition state immediately to prevent multiple clicks
    setSelectedRole(role);
    setIsTransitioning(true);
    
    try {
      console.log(`[SELECT_ROLE] Starting role transition to ${role}`);
      
      // Set a flag in localStorage to indicate we're in a transition
      // This will be used to prevent RoleLayoutLoading from showing
      if (typeof window !== 'undefined') {
        localStorage.setItem('telloom_role_transition', 'true');
        localStorage.setItem('telloom_transition_timestamp', Date.now().toString());
      }
      
      // Determine the target URL based on role
      const targetUrl = `/role-${role.toLowerCase()}`;
      
      // Make the API call to set the role
      const response = await fetch('/api/select-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error('Failed to select role');
      }
      
      console.log(`[SELECT_ROLE] API call successful, navigating to ${targetUrl}`);
      
      // Use router.push with replace to avoid adding to history
      router.push(targetUrl, { scroll: false });
      
    } catch (error) {
      console.error('Error selecting role:', error);
      toast.error('Failed to select role. Please try again.');
      setSelectedRole(null);
      setIsTransitioning(false);
      
      // Clear the transition flag if there was an error
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
        <Link href="/" className="mb-8">
          <Image
            src="/images/Telloom Logo V1-Horizontal Green.png"
            alt="Telloom Logo"
            width={160}
            height={40}
            priority={true}
            style={{
              width: 'auto',
              height: 'auto',
              maxWidth: '160px'
            }}
          />
        </Link>
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