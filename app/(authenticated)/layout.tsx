import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {children}
    </div>
  );
} 