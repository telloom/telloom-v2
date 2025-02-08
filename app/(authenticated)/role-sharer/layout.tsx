// app/role-sharer/layout.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function RoleSharerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  // Only check for authentication, not roles
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
