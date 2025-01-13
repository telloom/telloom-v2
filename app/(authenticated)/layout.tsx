import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  
  try {
    // Verify user is authenticated using getUser
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth error:', error);
      redirect('/login');
    }
    
    if (!user) {
      redirect('/login');
    }

    // Verify user has required role
    const { data: roles } = await supabase
      .from('ProfileRole')
      .select('role')
      .eq('profileId', user.id);

    if (!roles?.length) {
      redirect('/select-role');
    }

    return (
      <div className="min-h-screen bg-background">
        <Header />
        {children}
      </div>
    );
  } catch (error) {
    console.error('Layout error:', error);
    redirect('/login');
  }
} 