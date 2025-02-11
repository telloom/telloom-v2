'use client';

/**
 * File: app/(authenticated)/role-sharer/connections/page.tsx
 * Description: Page component for managing sharer's connections (listeners and executors)
 */

import BackButton from '@/components/BackButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import InvitationsList from '@/components/sharer/connections/InvitationsList';
import ActiveConnections from '@/components/sharer/connections/ActiveConnections';
import PendingFollowRequests from '@/components/sharer/connections/PendingFollowRequests';
import InviteModal from '@/components/invite/InviteModal';
import { useState } from 'react';
import { UserPlus } from 'lucide-react';

export default function SharerConnectionsPage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton href="/role-sharer" />
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manage Connections</h1>
        <Button 
          onClick={() => setIsInviteModalOpen(true)}
          className="gap-2 rounded-full"
        >
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </div>

      <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg">
        <div className="p-6">
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active Connections</TabsTrigger>
              <TabsTrigger value="pending">Pending Invitations</TabsTrigger>
              <TabsTrigger value="requests">Follow Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <ActiveConnections />
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              <InvitationsList />
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              <PendingFollowRequests />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <InviteModal 
        open={isInviteModalOpen} 
        onOpenChange={setIsInviteModalOpen} 
      />
    </div>
  );
} 