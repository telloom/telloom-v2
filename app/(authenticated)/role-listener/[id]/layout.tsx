// app/(authenticated)/role-listener/[id]/layout.tsx
// Layout for viewing a specific Sharer's content as a Listener.

import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ReactNode, Suspense } from 'react';
import { ListenerSharerHeader } from '@/components/listener/ListenerSharerHeader';
import { BackButton } from '@/components/ui/BackButton';

interface ListenerSharerLayoutProps {
  params: {
    id: string; // This will be ProfileSharer.id
  };
  children: ReactNode;
}

// Define the expected shape of the sharer profile data from the RPC
interface SharerProfileData {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export default async function ListenerSharerLayout({ params, children }: ListenerSharerLayoutProps) {
  const supabase = await createClient();

  // 1. Resolve Params (as per guidelines)
  const resolvedParams = await Promise.resolve(params);
  const sharerId = resolvedParams.id;

  if (!sharerId) {
    console.warn('[role-listener/[id]/layout] Sharer ID missing from params.');
    return notFound();
  }

  // 2. Check Authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('[role-listener/[id]/layout] Authentication error:', userError?.message);
    return redirect('/login');
  }

  // 3. Access Control: Verify listener relationship using RPC
  const { data: hasAccess, error: accessError } = await supabase
    .rpc('check_listener_access_rpc', {
      p_listener_id: user.id,
      p_sharer_id: sharerId
    })
    .single<boolean>(); // Expecting a single boolean result

  if (accessError) {
    console.error('[role-listener/[id]/layout] Error checking listener access via RPC:', accessError.message);
    // Log the actual error from the RPC if available
    return redirect('/role-listener?error=access_check_failed');
  }

  // Check the boolean result from the RPC
  if (hasAccess !== true) { // Explicitly check for true
    console.warn(`[role-listener/[id]/layout] Access denied via RPC: User ${user.id} does not have listener access to sharer ${sharerId}.`);
    return redirect('/role-listener?error=access_denied'); // Redirect if no access
  }

  // 4. Fetch Sharer Profile Data for Header (using RPC)
  const { data: sharerProfileData, error: profileError } = await supabase
    .rpc('get_sharer_profile_for_header', { p_sharer_id: sharerId })
    .single<SharerProfileData>(); // Expecting a single JSON object

  if (profileError || !sharerProfileData) {
    console.error('[role-listener/[id]/layout] Error fetching sharer profile via RPC:', profileError?.message);
    // Handle case where sharer profile might not be found, though access check passed
    // Could show a generic header or redirect
    return notFound(); // Or redirect('/role-listener?error=profile_fetch_failed');
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <BackButton />
        <ListenerSharerHeader
          sharerId={sharerId}
          firstName={sharerProfileData?.firstName}
          lastName={sharerProfileData?.lastName}
          avatarUrl={sharerProfileData?.avatarUrl}
        />
      </div>
      <Suspense fallback={<div>Loading content...</div>}> {/* Add Suspense */}
        {children}
      </Suspense>
    </div>
  );
}
