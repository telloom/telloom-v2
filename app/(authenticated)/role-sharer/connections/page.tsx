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
import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function SharerConnectionsPage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('active');

  // Set the active tab based on URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['active', 'pending', 'requests'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', value);
    router.push(`?${newParams.toString()}`);
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <BackButton href="/role-sharer" />
            <h1 className="text-2xl sm:text-3xl font-bold">Manage Connections</h1>
          </div>
          <Button 
            onClick={() => setIsInviteModalOpen(true)}
            className="w-full sm:w-auto gap-2 rounded-full"
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        </div>

        <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg">
          <div className="p-4 sm:p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active" className="text-sm sm:text-base">Active</TabsTrigger>
                <TabsTrigger value="pending" className="text-sm sm:text-base">Pending</TabsTrigger>
                <TabsTrigger value="requests" className="text-sm sm:text-base">Requests</TabsTrigger>
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
      </div>

      <InviteModal 
        open={isInviteModalOpen} 
        onOpenChange={setIsInviteModalOpen} 
      />
    </div>
  );
} 