/**
 * File: app/(authenticated)/role-listener/connections/page.tsx
 * Description: Page component for managing listener's connections with sharers
 */

'use client';

// import { Metadata } from 'next'; // Ensure Metadata import is also removed or commented out
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PendingFollowRequests from '@/components/listener/connections/PendingFollowRequests';
import ActiveSharings from '@/components/listener/connections/ActiveSharings';
import PendingInvitationsListener from '@/components/listener/connections/PendingInvitationsListener';
import { RequestFollowFormWrapper } from '@/components/listener/RequestFollowFormWrapper';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useListenerConnectionsStore } from '@/stores/connections/listenerConnectionsStore';
import { useUserStore } from '@/stores/userStore'; // For listenerEmail
import { useAuth } from '@/hooks/useAuth'; // For user object if profile not loaded
import BackButton from '@/components/BackButton'; // Added BackButton import

// Remove the metadata export entirely
// export const metadata: Metadata = {
//   title: 'Connections | Telloom',
//   description: 'Manage your connections with sharers',
// };

export default function ListenerConnectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'following';
  const [activeTab, setActiveTab] = useState(currentTab);

  const {
    sharers,
    followRequests,
    pendingInvitations,
    fetchSharings,
    fetchFollowRequests,
    fetchPendingInvitations,
    isLoading: storeIsLoading, // Use this for loading state if needed
  } = useListenerConnectionsStore();

  const { profile } = useUserStore();
  const { user } = useAuth();
  const listenerEmail = profile?.email || user?.email;

  useEffect(() => {
    // Sync tab state if URL changes
    const tabFromUrl = searchParams.get('tab') || 'following';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    // Fetch data when component mounts or listenerEmail becomes available
    fetchSharings();
    fetchFollowRequests();
    if (listenerEmail) {
      fetchPendingInvitations(listenerEmail);
    }
  }, [fetchSharings, fetchFollowRequests, fetchPendingInvitations, listenerEmail]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/role-listener/connections?tab=${value}`);
  };

  const followingCount = sharers.length;
  const requestsCount = followRequests.length;
  const invitationsCount = pendingInvitations.length;

  return (
    <div className="h-[calc(100vh-65px)] overflow-y-auto pb-8">
      <div className="container max-w-4xl mx-auto space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="mb-4 md:mb-6">
          <BackButton href="/role-listener" label="Back to Listener Dashboard" />
        </div>
        <div className="flex flex-col gap-1 md:gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Connections</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your connections with sharers
          </p>
        </div>

        <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg">
          <div className="p-3 sm:p-4 md:p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
              <TabsList className="overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="following" className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">
                  Following {followingCount > 0 ? `(${followingCount})` : ''}
                </TabsTrigger>
                <TabsTrigger value="requests" className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">
                  Follow Requests {requestsCount > 0 ? `(${requestsCount})` : ''}
                </TabsTrigger>
                <TabsTrigger value="invitations" className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">
                  Invitations {invitationsCount > 0 ? `(${invitationsCount})` : ''}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="following" className="space-y-4">
                <ActiveSharings />
              </TabsContent>

              <TabsContent value="requests" className="space-y-4">
                <PendingFollowRequests />
              </TabsContent>

              <TabsContent value="invitations" className="space-y-4">
                <PendingInvitationsListener />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg">
          <div className="p-3 sm:p-4 md:p-6">
            <div className="mb-3 md:mb-4">
              <h2 className="text-xl md:text-2xl font-semibold">Connect with a New Sharer</h2>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                Enter the email address of the person whose stories you'd like to follow.
              </p>
            </div>
            <RequestFollowFormWrapper />
          </div>
        </div>
      </div>
    </div>
  );
} 