// components/RoleSelection.tsx
// This component handles the role selection process for users

"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Headphones, VideoIcon, BookMarked } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Role } from '@/types/models'

interface RoleCardProps {
  role: Role;
  title: string;
  description: string;
  icon: React.ElementType;
  disabled?: boolean;
  available?: boolean;
  selected?: boolean;
  onSelect: (role: Role) => void;
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
        
        if (userData.user?.roles) {
          setAvailableRoles(userData.user.roles);
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

  const RoleCard = ({ role, title, description, icon: Icon, disabled = false, available = false, selected = false, onSelect }: RoleCardProps) => (
    <Card 
      className={cn(
        "border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300",
        "relative cursor-pointer min-h-[240px]",
        selected ? "bg-[#1B4332] text-white" : "hover:bg-gray-50",
        (disabled || !available) && "opacity-50 cursor-not-allowed hover:bg-background hover:shadow-[6px_6px_0_0_#8fbc55]"
      )}
      onClick={() => !disabled && available && onSelect(role)}
    >
      <CardHeader className="space-y-4 p-5">
        <div className="flex items-center justify-center">
          <Icon className={cn(
            "w-10 h-10",
            selected ? "text-white" : "text-[#1B4332]"
          )} />
        </div>
        <CardTitle className={cn(
          "text-center text-2xl font-semibold",
          selected ? "text-white" : "text-[#1B4332]"
        )}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <p className={cn(
          "text-center text-sm",
          selected ? "text-white/90" : "text-muted-foreground"
        )}>
          {description}
        </p>
        {(disabled || !available) && (
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className={cn(
              "text-xs font-medium px-3 py-1 rounded-full bg-gray-100",
              "text-muted-foreground"
            )}>
              {disabled ? "Invitation Only" : "Not Available"}
            </span>
          </div>
        )}
        {selected && (
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="text-xs font-medium text-white/90">
              Currently Selected
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#1B4332]">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-[#1B4332]">Select Your Role</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <RoleCard
          role={Role.LISTENER}
          title="Listener"
          description="View and celebrate the personal stories, details, and wisdom of your loved ones."
          icon={Headphones}
          available={availableRoles.includes(Role.LISTENER)}
          selected={selectedRole === Role.LISTENER}
          onSelect={handleRoleSelect}
        />
        <RoleCard
          role={Role.SHARER}
          title="Sharer"
          description="Capture your life's stories, facts, and wisdom so your family can connect with your experiences."
          icon={VideoIcon}
          available={availableRoles.includes(Role.SHARER)}
          selected={selectedRole === Role.SHARER}
          onSelect={handleRoleSelect}
        />
        <RoleCard
          role={Role.EXECUTOR}
          title="Executor"
          description="Manage and organize a Sharer's content, ensuring their stories, facts, and insights stay well-preserved."
          icon={BookMarked}
          available={availableRoles.includes(Role.EXECUTOR)}
          selected={selectedRole === Role.EXECUTOR}
          disabled={!availableRoles.includes(Role.EXECUTOR)}
          onSelect={handleRoleSelect}
        />
      </div>
    </div>
  )
}