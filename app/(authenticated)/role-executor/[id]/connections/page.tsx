import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import ConnectionsPageContent from '@/components/executor/connections/ConnectionsPageContent';
import { getSignedAvatarUrl } from '@/utils/avatar';

interface Props {
  params: {
    id: string;
  };
}

interface ProfileData {
  id: string;
  Profile: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
}

export default async function SharerExecutorConnectionsPage({ params }: Props) {
  try {
    const supabase = createClient();
    const resolvedParams = await Promise.resolve(params);
    const sharerId = resolvedParams.id;

    // Fetch sharer details
    const { data: sharer, error } = await supabase
      .from('ProfileSharer')
      .select(`
        id,
        Profile!inner (
          firstName,
          lastName,
          avatarUrl
        )
      `)
      .eq('id', sharerId)
      .single() as { data: ProfileData | null; error: any };

    if (error || !sharer?.Profile) {
      console.error('Error fetching sharer:', error);
      notFound();
    }

    const sharerName = `${sharer.Profile.firstName || ''} ${sharer.Profile.lastName || ''}`.trim();
    
    // Get signed avatar URL if available
    let avatarUrl = null;
    if (sharer.Profile.avatarUrl) {
      avatarUrl = await getSignedAvatarUrl(sharer.Profile.avatarUrl);
    }

    return (
      <Suspense fallback={<div>Loading...</div>}>
        <ConnectionsPageContent 
          sharerId={sharer.id} 
          sharerName={sharerName} 
          sharerAvatarUrl={avatarUrl}
        />
      </Suspense>
    );
  } catch (error) {
    console.error('Error in SharerExecutorConnectionsPage:', error);
    notFound();
  }
} 