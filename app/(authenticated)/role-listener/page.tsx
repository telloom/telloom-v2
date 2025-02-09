import { createClient } from '@/utils/supabase/server';
import { RequestFollowFormWrapper } from '@/components/listener/RequestFollowFormWrapper';
import PendingFollowRequests from '@/components/listener/PendingFollowRequests';

export default async function RoleListenerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check if user has any listener relationships
  const { data: listenerRelationships, error: relationshipsError } = await supabase
    .from('ProfileListener')
    .select('*')
    .eq('listenerId', user.id)
    .eq('hasAccess', true);

  // Fetch pending follow requests
  const { data: pendingRequests, error: requestsError } = await supabase
    .from('FollowRequest')
    .select(`
      id,
      status,
      createdAt,
      sharer:ProfileSharer!sharerId (
        id,
        profile:Profile!profileId (
          firstName,
          lastName,
          email,
          avatarUrl
        )
      )
    `)
    .eq('requestorId', user.id)
    .eq('status', 'PENDING')
    .order('createdAt', { ascending: false });

  if (relationshipsError) {
    console.error('Error fetching listener relationships:', relationshipsError);
  }

  if (requestsError) {
    console.error('Error fetching pending requests:', requestsError);
  }

  return (
    <div className="flex h-full">
      <div className="container max-w-4xl mx-auto px-4 pt-6">
        {(!listenerRelationships || listenerRelationships.length === 0) ? (
          <div className="max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-center mb-3 text-black">
              Connect with a Sharer
            </h1>
            <p className="text-center text-muted-foreground mb-4">
              Enter their email address below to send a follow request.
            </p>
            <RequestFollowFormWrapper />
            
            {pendingRequests && pendingRequests.length > 0 && (
              <div className="mt-4">
                <PendingFollowRequests requests={pendingRequests} />
              </div>
            )}
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-center mb-4 text-black">
              Your Sharers
            </h1>
            {pendingRequests && pendingRequests.length > 0 && (
              <div className="mb-4">
                <PendingFollowRequests requests={pendingRequests} />
              </div>
            )}
            {/* We'll add the content for viewing sharers here later */}
          </div>
        )}
      </div>
    </div>
  );
}
