'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import BackButton from '@/components/back-button';
import ActiveConnections from '@/components/connections/active-connections';
import InvitationsList from '@/components/connections/invitations-list';
import PendingFollowRequests from '@/components/connections/pending-follow-requests';
import { useSearchParams } from 'next/navigation';

interface Props {
  params: {
    id: string;
  };
}

export default function SharerExecutorConnectionsPage({ params }: Props) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'active';
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="mb-8">
        <BackButton href={`/role-executor/${params.id}`} label="Back to Sharer" />
        <h1 className="text-2xl font-bold mt-4">Manage Connections</h1>
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
              sharerId={params.id}
              role="EXECUTOR"
            />
          </TabsContent>

          <TabsContent value="pending">
            <InvitationsList
              sharerId={params.id}
              role="EXECUTOR"
            />
          </TabsContent>

          <TabsContent value="requests">
            <PendingFollowRequests
              sharerId={params.id}
              role="EXECUTOR"
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
} 