import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {children}
    </div>
  );
} 