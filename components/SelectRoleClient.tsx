'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Headphones, Share2, UserCog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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
    description: 'Listen to and preserve stories from your loved ones',
    icon: Headphones,
  },
  {
    role: 'SHARER',
    title: 'Sharer',
    description: 'Share your life stories with future generations',
    icon: Share2,
  },
  {
    role: 'EXECUTOR',
    title: 'Executor',
    description: 'Manage digital legacy for others',
    icon: UserCog,
  },
];

export default function SelectRoleClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/select-role');
        const data = await response.json();
        if (data.roles) {
          setAvailableRoles(data.roles);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        toast.error('Failed to load available roles');
      }
    };

    fetchRoles();
  }, []);

  const handleRoleSelect = async (role: Role) => {
    if (!availableRoles.includes(role)) {
      toast.error('This role is not available');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/select-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to select role');
      }

      if (data.success && data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Error selecting role:', error);
      toast.error(error.message || 'Failed to select role');
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-6xl py-6 space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold">Select Your Role</h1>
        <p className="text-muted-foreground">Choose how you want to use Telloom</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ROLES.map(({ role, title, description, icon: Icon }) => {
          const isAvailable = availableRoles.includes(role);
          
          return (
            <Card
              key={role}
              className={`p-6 space-y-4 text-center transition-all duration-300 border-2 border-[#1B4332] 
                ${isAvailable 
                  ? 'cursor-pointer shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55]' 
                  : 'opacity-50 cursor-not-allowed'
                }`}
              onClick={() => !isLoading && handleRoleSelect(role)}
            >
              <div className="flex justify-center">
                <Icon className="h-12 w-12 text-[#1B4332]" />
              </div>
              <h2 className="text-2xl font-semibold">{title}</h2>
              <p className="text-muted-foreground">{description}</p>
              {!isAvailable && (
                <div className="text-xs text-muted-foreground mt-2">
                  Role not available
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1B4332]" />
        </div>
      )}
    </div>
  );
} 