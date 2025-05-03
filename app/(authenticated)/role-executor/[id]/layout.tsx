import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RoleLayoutLoading from '@/components/RoleLayoutLoading';

interface Props {
  children: React.ReactNode;
  params: {
    id: string;
  };
  modal?: React.ReactNode; // Add the modal prop required by LayoutProps
}

// List of special routes that should bypass UUID validation
const SPECIAL_ROUTES = ['connections'];

async function RoleExecutorSharerLayoutContent({ 
  children,
  params 
}: Props) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sharerId = resolvedParams.id;

    // console.log('[LAYOUT DEBUG role-executor/[id]] Received ID parameter:', sharerId);

    // Check if this is a special route first
    if (SPECIAL_ROUTES.includes(sharerId)) {
      // console.log('[LAYOUT DEBUG role-executor/[id]] Special route detected, redirecting');
      redirect(`/role-executor/(routes)/${sharerId}`);
    }
    
    // Validate sharerId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sharerId)) {
      // console.error('[LAYOUT DEBUG role-executor/[id]] Invalid sharerId format, redirecting to /role-executor:', sharerId);
      redirect('/role-executor'); // Redirect 1
    }
    
    // Properly await the client creation
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      // console.error('[LAYOUT DEBUG role-executor/[id]] Authentication failed, redirecting to /login:', userError);
      redirect('/login'); // Redirect 2
    }

    // console.log('[LAYOUT DEBUG role-executor/[id]] Authenticated user ID:', user.id);

    // Use the RPC function to verify executor role and relationships
    const { data: executorData, error: executorError } = await supabase
      .rpc('get_executor_for_user', { user_id: user.id });

    if (executorError) {
      // console.error('[LAYOUT DEBUG role-executor/[id]] Error retrieving executor data, redirecting to /role-executor:', executorError);
      redirect('/role-executor'); // Redirect 3
    }

    // Check if the user has at least one executor relationship
    const hasExecutorRole = executorData?.has_executor_relationship || false;
    if (!hasExecutorRole) {
      // console.error('[LAYOUT DEBUG role-executor/[id]] User does not have executor role, redirecting to /select-role');
      redirect('/select-role'); // Redirect 4
    }
    
    // Extract relationships from the response
    const executorRelationships = executorData?.executor_relationships || [];
    // console.log('[LAYOUT DEBUG role-executor/[id]] Executor relationships count:', executorRelationships.length);
    
    // Check if the executor has a relationship with the specified sharer
    const relationship = executorRelationships.find((rel: any) => rel.sharerId === sharerId);
    
    if (!relationship) {
      // console.error('[LAYOUT DEBUG role-executor/[id]] User does not have executor relationship with sharerId, redirecting to /role-executor:', sharerId);
      redirect('/role-executor'); // Redirect 5
    }

    // console.log('[LAYOUT DEBUG role-executor/[id]] Found valid executor relationship:', relationship);
    // console.log('[LAYOUT DEBUG role-executor/[id]] Layout checks passed, rendering children.');

    return children;
  } catch (error) {
    // Catch potential redirect errors specifically
    if (typeof error === 'object' && error !== null && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      // console.log('[LAYOUT DEBUG role-executor/[id]] Caught NEXT_REDIRECT, re-throwing...');
      throw error; // Re-throw to allow Next.js to handle the redirect
    }
    // console.error('[LAYOUT DEBUG role-executor/[id]] Error in RoleExecutorSharerLayoutContent, redirecting to /role-executor:', error);
    redirect('/role-executor'); // Redirect 6 (Catch-all)
  }
}

export default async function RoleExecutorSharerLayout(props: Props) {
  return (
    <Suspense fallback={<RoleLayoutLoading />}>
      {/* Await the content component instead of using it directly */}
      {await RoleExecutorSharerLayoutContent(props)}
    </Suspense>
  );
} 