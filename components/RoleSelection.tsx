// components/RoleSelection.tsx
// This component handles the role selection process for users

"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Ear, Share2, Briefcase } from 'lucide-react'
import { cn } from "@/lib/utils"

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const router = useRouter()

  const handleRoleSelect = async (role: string) => {
    if (role === 'EXECUTOR') return // Executor is disabled

    setSelectedRole(role)

    try {
      const res = await fetch('/api/select-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error)
      }

      // Navigate to the correct root page for each role
      switch (role) {
        case 'LISTENER':
          router.push('/role-listener')
          break
        case 'SHARER':
          router.push('/role-sharer')
          break
        case 'EXECUTOR':
          router.push('/role-executor')
          break
        default:
          throw new Error('Invalid role selected')
      }
    } catch (error) {
      console.error('Error selecting role:', error)
      alert(error instanceof Error ? error.message : 'An error occurred')
      setSelectedRole(null)
    }
  }

  const RoleCard = ({ role, title, description, icon: Icon, disabled = false }) => (
    <Card 
      className={cn(
        "relative cursor-pointer transition-all duration-300",
        selectedRole === role 
          ? "bg-primary text-primary-foreground shadow-lg" 
          : "hover:bg-secondary",
        disabled && "opacity-50 cursor-not-allowed hover:bg-background"
      )}
      onClick={() => !disabled && handleRoleSelect(role)}
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
          disabled && "bg-muted text-muted-foreground"
        )}>
          {disabled ? "Invitation Only" : (selectedRole === role ? "Selected" : "Select")}
        </span>
      </CardFooter>
    </Card>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Select Your Role</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RoleCard
          role="LISTENER"
          title="Listener"
          description="Listen and provide support to others in the community."
          icon={Ear}
        />
        <RoleCard
          role="SHARER"
          title="Sharer"
          description="Share your experiences and seek support from the community."
          icon={Share2}
        />
        <RoleCard
          role="EXECUTOR"
          title="Executor"
          description="Execute tasks and manage community projects."
          icon={Briefcase}
          disabled
        />
      </div>
    </div>
  )
}