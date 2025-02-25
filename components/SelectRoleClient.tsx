'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Headphones, Share2, UserCog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';

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
    <div className="w-full text-center">
      {isLoading ? (
        <>
          <Link href="/" className="mb-8 block">
            <Image
              src="/images/Telloom Logo V1-Horizontal Green.png"
              alt="Telloom Logo"
              width={120}
              height={27}
              priority={true}
              style={{
                width: '120px',
                height: 'auto',
                maxWidth: '100%'
              }}
            />
          </Link>
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1B4332] border-t-transparent" />
          </div>
        </>
      ) : (
        <>
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
                  onClick={() => !isLoading && handleRoleSelect(role)}
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
        </>
      )}
    </div>
  );
} 