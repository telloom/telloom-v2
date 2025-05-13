import { createClient } from '@/utils/supabase/server';
import { RequestFollowFormWrapper } from '@/components/listener/RequestFollowFormWrapper';
import PendingFollowRequests from '@/components/listener/PendingFollowRequests';
import { redirect } from 'next/navigation';
import ListenerSharingCard from '@/components/listener/ListenerSharingCard';
import { getSignedAvatarUrl } from '@/utils/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Define the expected structure for a pending request item
// Adjust types (e.g., string/number for id) if they differ in your schema
// This should ideally match the props definition in PendingFollowRequests component
interface PendingRequest {
  id: string;
  status: string;
  createdAt: string;
  sharer: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl: string | null;
    };
  } | null; // Allow null if data is incomplete/missing due to RLS or joins
}

// Define structure for listener relationship, including sharer details
interface ListenerRelationship {
  id: string;
  listenerId: string;
  sharerId: string; // This is ProfileSharer.id
  hasAccess: boolean;
  sharedSince: string;
  createdAt: string;
  updatedAt: string;
  sharer: { // Added Sharer details
    id: string; // ProfileSharer.id
    profileId: string; // Profile.id of the Sharer
    profile: {
      id: string; // Profile.id
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl: string | null;
    };
  };
}

export default async function RoleListenerPage() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error or user not found:', userError);
      return redirect('/login');
    }

    // Fetch listener relationships and pending requests using the RPC function
    const { data: pageData, error: rpcError } = await supabase
      .rpc('get_listener_page_data', { p_user_id: user.id });

    if (rpcError) {
      console.error('Error fetching listener page data via RPC:', rpcError.message);
      // Consider rendering an error state here
    }

    // Extract data safely, providing empty arrays as defaults
    const listenerRelationships: ListenerRelationship[] = pageData?.listenerRelationships ?? [];
    const pendingRequests: PendingRequest[] = pageData?.pendingRequests ?? [];

    // Process avatar URLs to get signed URLs (Similar to role-executor/page.tsx)
    for (const relationship of listenerRelationships) {
      if (relationship.sharer.profile.avatarUrl) {
        relationship.sharer.profile.avatarUrl = await getSignedAvatarUrl(
          relationship.sharer.profile.avatarUrl
        );
      }
    }

    // Also process pending request avatar URLs if needed by PendingFollowRequests component
    // (Assuming PendingFollowRequests might use avatars too)
    for (const request of pendingRequests) {
      if (request.sharer?.profile.avatarUrl) {
        request.sharer.profile.avatarUrl = await getSignedAvatarUrl(
          request.sharer.profile.avatarUrl
        );
      }
    }

    return (
      <div className="flex h-full">
        <div className="container max-w-4xl mx-auto px-4 pt-6 pb-12 space-y-8">
          
          {/* Section: Pending Requests (if any) */}
          {pendingRequests.length > 0 && (
            <div>
              <PendingFollowRequests requests={pendingRequests} title="Pending Requests" />
            </div>
          )}

          {/* Section: Connected Sharers (if any) */}
          {listenerRelationships.length > 0 && (
            <div>
              <h1 className="text-2xl font-bold mb-1 text-black">
                Listen to a Sharer
              </h1>
              <p className="text-muted-foreground mb-4">
                Choose an individual to dive into their stories, family history, and perspectives through video interviews, photos, and succinct write‑ups—all neatly organized for effortless viewing.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listenerRelationships.map(relationship => (
                  <ListenerSharingCard
                    key={relationship.id}
                    listenerRelationship={relationship}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: Request to Follow (Always visible, styled based on context) */}
          <div className={
            (listenerRelationships.length > 0 || pendingRequests.length > 0) 
            ? "pt-8"
            : ""
          }>
            <Card className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
              <CardHeader className={
                (listenerRelationships.length === 0 && pendingRequests.length === 0) ? "text-center" : ""
              }>
                <CardTitle className="text-2xl font-bold text-black">
                  Connect with a New Sharer
                </CardTitle>
                <p className="text-muted-foreground pt-1">
                  Enter the email address of the person whose stories you'd like to follow to send a request.
                </p>
              </CardHeader>
              <CardContent className="pt-0 pb-6 px-6">
                <RequestFollowFormWrapper />
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    );
  } catch (error) {
    // Catch any unexpected errors during component execution
    console.error('Unexpected error in RoleListenerPage:', error);
    // Redirect to login or an error page as a fallback
    return redirect('/login?error=unexpected');
  }
}
