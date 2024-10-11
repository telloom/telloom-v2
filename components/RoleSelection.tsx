// components/RoleSelection.tsx
// This component handles the role selection process for users

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const router = useRouter();

  const onSubmit = async () => {
    if (!selectedRole) return;

    try {
      const res = await fetch('/api/select-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }

      router.push(`/${selectedRole.toLowerCase()}/onboarding`);
    } catch (error) {
      console.error('Error selecting role:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Select Your Role</h1>
      <RadioGroup value={selectedRole} onValueChange={setSelectedRole}>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="LISTENER" id="listener" />
            <Label htmlFor="listener">Listener</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="SHARER" id="sharer" />
            <Label htmlFor="sharer">Sharer</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="EXECUTOR" id="executor" disabled />
            <Label htmlFor="executor" className="text-gray-500">Executor (Please sign up via an invitation link)</Label>
          </div>
        </div>
      </RadioGroup>
      <Button onClick={onSubmit} disabled={!selectedRole}>Continue</Button>
    </div>
  );
}