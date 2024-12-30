// app/role-sharer/layout.tsx
import { redirect } from 'next/navigation';
import { checkRole, getUser } from '@/utils/supabase/server';
import Header from '@/components/Header';
import { createClient } from '@/utils/supabase/server';

export default async function RoleSharerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const hasAccess = await checkRole('SHARER');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
