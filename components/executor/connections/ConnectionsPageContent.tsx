'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import BackButton from '@/components/BackButton';
import ActiveConnections from '@/components/executor/connections/ActiveConnections';
import InvitationsList from '@/components/executor/connections/InvitationsList';
import PendingFollowRequests from '@/components/executor/connections/PendingFollowRequests';
import ExecutorInviteModal from '@/components/executor/connections/ExecutorInviteModal';
import { useSearchParams } from 'next/navigation';
import UserAvatar from '@/components/UserAvatar';

interface ConnectionsPageContentProps {
  sharerId: string;
  sharerName: string;
  sharerAvatarUrl: string | null;
}

export default function ConnectionsPageContent({ 
  sharerId, 
  sharerName,
  sharerAvatarUrl
}: ConnectionsPageContentProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'active';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="mb-8">
        <BackButton href={`/role-executor/${sharerId}`} label="Back to Sharer" />
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-4">
            <UserAvatar 
              avatarImageUrl={sharerAvatarUrl}
              firstName={sharerName.split(' ')[0] || ''}
              lastName={sharerName.split(' ')[1] || ''}
              size="h-12 w-12"
            />
            <h1 className="text-2xl font-bold">
              Managing Connections for {sharerName}
            </h1>
          </div>
          <Button
            onClick={() => setIsInviteModalOpen(true)}
            className="gap-2 rounded-full border-[1px] hover:bg-[#1B4332] hover:text-white transition-colors"
            variant="outline"
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        </div>
      </div>

      <Card className="p-6 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <ActiveConnections
              sharerId={sharerId}
              role="EXECUTOR"
            />
          </TabsContent>

          <TabsContent value="pending">
            <InvitationsList
              sharerId={sharerId}
              role="EXECUTOR"
            />
          </TabsContent>

          <TabsContent value="requests">
            <PendingFollowRequests
              sharerId={sharerId}
              role="EXECUTOR"
            />
          </TabsContent>
        </Tabs>
      </Card>

      <ExecutorInviteModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        sharerId={sharerId}
        sharerName={sharerName}
      />
    </div>
  );
} 