import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RoleLayoutLoading from '@/components/RoleLayoutLoading';
import { notFound } from 'next/navigation';

interface Props {
  children: React.ReactNode;
  params: {
    id: string;
  };
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

    // Check if this is a special route first
    if (SPECIAL_ROUTES.includes(sharerId)) {
      redirect(`/role-executor/(routes)/${sharerId}`);
    }
    
    // Validate sharerId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sharerId)) {
      console.error('Invalid sharerId format:', sharerId);
      redirect('/role-executor');
    }
    
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Authentication failed:', userError);
      redirect('/login');
    }

    // Get user roles
    const { data: roles } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id);

    // Check if user has executor role
    const isExecutor = roles?.some(role => role.role === 'EXECUTOR');
    if (!isExecutor) {
      console.error('User lacks executor role');
      redirect('/select-role');
    }

    // Verify executor relationship exists
    const { data: executorRelationship, error: relationshipError } = await supabase
      .from('ProfileExecutor')
      .select(`
        id,
        sharerId,
        sharer:ProfileSharer!inner (
          id,
          profile:Profile!inner (
            id,
            firstName,
            lastName
          )
        )
      `)
      .eq('executorId', user.id)
      .eq('sharerId', sharerId)
      .single();

    if (relationshipError || !executorRelationship) {
      console.error('Invalid executor relationship:', { sharerId, error: relationshipError });
      redirect('/role-executor');
    }

    return children;
  } catch (error) {
    console.error('Error in RoleExecutorSharerLayoutContent:', error);
    redirect('/role-executor');
  }
}

export default async function RoleExecutorSharerLayout(props: Props) {
  return (
    <Suspense fallback={<RoleLayoutLoading />}>
      <RoleExecutorSharerLayoutContent {...props} />
    </Suspense>
  );
} 