// components/RoleSelection.tsx
// This component handles the role selection process for users

"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Ear, Share2, Briefcase } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Role } from '@/types/models'

interface RoleCardProps {
  role: Role;
  title: string;
  description: string;
  icon: React.ElementType;
  disabled?: boolean;
  available?: boolean;
}

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Fetch available roles and current active role on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        // Get user's roles from ProfileRole
        const rolesResponse = await fetch('/api/auth/user');
        const userData = await rolesResponse.json();
        
        if (userData.user?.profile?.roles) {
          setAvailableRoles(userData.user.profile.roles);
        }

        // Get active role if exists
        const activeRoleResponse = await fetch('/api/select-role');
        const { role: activeRole } = await activeRoleResponse.json();
        
        if (activeRole) {
          setSelectedRole(activeRole as Role);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const handleRoleSelect = async (role: Role) => {
    if (!availableRoles.includes(role)) return;

    try {
      const response = await fetch('/api/select-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set role');
      }

      setSelectedRole(role);

      // Navigate to the correct root page for each role
      switch (role) {
        case Role.LISTENER:
          router.push('/role-listener');
          break;
        case Role.SHARER:
          router.push('/role-sharer');
          break;
        case Role.EXECUTOR:
          router.push('/role-executor');
          break;
        default:
          throw new Error('Invalid role selected');
      }
    } catch (error) {
      console.error('Error setting role:', error);
      setSelectedRole(null);
    }
  };

  const RoleCard = ({ role, title, description, icon: Icon, disabled = false, available = false }: RoleCardProps) => (
    <Card 
      className={cn(
        "relative cursor-pointer transition-all duration-300",
        selectedRole === role 
          ? "bg-primary text-primary-foreground shadow-lg" 
          : "hover:bg-secondary",
        (disabled || !available) && "opacity-50 cursor-not-allowed hover:bg-background"
      )}
      onClick={() => !disabled && available && handleRoleSelect(role)}
    >
      <CardHeader>
        <CardTitle className={cn(
          "flex items-center justify-center text-2xl",
          selectedRole === role && "text-primary-foreground"
        )}>
          <Icon className="w-8 h-8 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn(
          "text-center",
          selectedRole === role && "text-primary-foreground"
        )}>
          {description}
        </p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <span className={cn(
          "px-4 py-2 rounded-full text-sm font-semibold",
          selectedRole === role 
            ? "bg-primary-foreground text-primary" 
            : "bg-secondary text-secondary-foreground",
          (disabled || !available) && "bg-muted text-muted-foreground"
        )}>
          {disabled 
            ? "Invitation Only" 
            : !available 
              ? "Not Available"
              : selectedRole === role 
                ? "Selected" 
                : "Select"}
        </span>
      </CardFooter>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Select Your Role</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RoleCard
          role={Role.LISTENER}
          title="Listener"
          description="Listen and provide support to others in the community."
          icon={Ear}
          available={availableRoles.includes(Role.LISTENER)}
        />
        <RoleCard
          role={Role.SHARER}
          title="Sharer"
          description="Share your experiences and seek support from the community."
          icon={Share2}
          available={availableRoles.includes(Role.SHARER)}
        />
        <RoleCard
          role={Role.EXECUTOR}
          title="Executor"
          description="Execute tasks and manage community projects."
          icon={Briefcase}
          available={availableRoles.includes(Role.EXECUTOR)}
          disabled={!availableRoles.includes(Role.EXECUTOR)}
        />
      </div>
    </div>
  )
}