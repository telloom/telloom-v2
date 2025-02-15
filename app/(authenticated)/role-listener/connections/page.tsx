/**
 * File: app/(authenticated)/role-listener/connections/page.tsx
 * Description: Page component for managing listener's connections with sharers
 */

import { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PendingFollowRequests from '@/components/listener/connections/PendingFollowRequests';
import ActiveSharings from '@/components/listener/connections/ActiveSharings';
import { RequestFollowFormWrapper } from '@/components/listener/RequestFollowFormWrapper';

export const metadata: Metadata = {
  title: 'Connections | Telloom',
  description: 'Manage your connections with sharers',
};

export default function ListenerConnectionsPage() {
  return (
    <div className="h-[calc(100vh-65px)] overflow-y-auto pb-8">
      <div className="container max-w-4xl mx-auto space-y-6 p-4 md:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Connections</h1>
          <p className="text-muted-foreground">
            Manage your connections with sharers
          </p>
        </div>

        <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg">
          <div className="p-4 sm:p-6">
            <Tabs defaultValue="active" className="space-y-4">
              <TabsList>
                <TabsTrigger value="active">Following</TabsTrigger>
                <TabsTrigger value="pending">Follow Requests</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                <ActiveSharings />
              </TabsContent>

              <TabsContent value="pending" className="space-y-4">
                <PendingFollowRequests />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg">
          <div className="p-4 sm:p-6">
            <RequestFollowFormWrapper />
          </div>
        </div>
      </div>
    </div>
  );
} 