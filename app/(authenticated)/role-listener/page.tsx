import { createClient } from '@/utils/supabase/server';
import { RequestFollowFormWrapper } from '@/components/listener/RequestFollowFormWrapper';

export default async function RoleListenerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check if user has any listener relationships
  const { data: listenerRelationships, error } = await supabase
    .from('ProfileListener')
    .select('*')
    .eq('listenerId', user.id)
    .eq('hasAccess', true);

  if (error) {
    console.error('Error fetching listener relationships:', error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {(!listenerRelationships || listenerRelationships.length === 0) ? (
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8 text-[#1B4332]">
            Connect with a Sharer
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            To get started, request to follow a Sharer by entering their email address below.
          </p>
          <RequestFollowFormWrapper />
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-bold text-center mb-8 text-[#1B4332]">
            Your Sharers
          </h1>
          {/* We'll add the content for viewing sharers here later */}
        </div>
      )}
    </div>
  );
}
