import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RoleExecutorLoading from './loading';

interface Props {
  children: React.ReactNode;
  params: {
    id: string;
  };
}

async function RoleExecutorSharerLayoutContent({ children, params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify executor relationship
  const { data: executorRelationship, error: relationshipError } = await supabase
    .from('ProfileExecutor')
    .select('id')
    .eq('executorId', user.id)
    .eq('sharerId', await Promise.resolve(params.id))
    .single();

  if (relationshipError || !executorRelationship) {
    redirect('/role-executor');
  }

  return <>{children}</>;
}

export default function RoleExecutorSharerLayout(props: Props) {
  return (
    <Suspense fallback={<RoleExecutorLoading />}>
      <RoleExecutorSharerLayoutContent {...props} />
    </Suspense>
  );
} 