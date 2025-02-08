import { checkRole } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function RoleListenerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user has LISTENER role
  const hasListenerRole = await checkRole('LISTENER');
  if (!hasListenerRole) {
    redirect('/select-role');
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}


