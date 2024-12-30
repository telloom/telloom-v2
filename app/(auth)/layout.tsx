import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/role-sharer/topics');
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
} 