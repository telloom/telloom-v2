import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import ConnectionsPageContent from '@/components/executor/connections/ConnectionsPageContent';

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
          lastName
        )
      `)
      .eq('id', sharerId)
      .single() as { data: ProfileData | null; error: any };

    if (error || !sharer?.Profile) {
      console.error('Error fetching sharer:', error);
      notFound();
    }

    const sharerName = `${sharer.Profile.firstName || ''} ${sharer.Profile.lastName || ''}`.trim();

    return (
      <Suspense fallback={<div>Loading...</div>}>
        <ConnectionsPageContent sharerId={sharer.id} sharerName={sharerName} />
      </Suspense>
    );
  } catch (error) {
    console.error('Error in SharerExecutorConnectionsPage:', error);
    notFound();
  }
} 