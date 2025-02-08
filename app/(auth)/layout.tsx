import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If there's a user, redirect to select-role
    if (user) {
      redirect('/select-role');
    }

    // If there's no user, show the auth pages
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {children}
      </div>
    );
  } catch (error) {
    console.error('Unexpected error in auth layout:', error);
    // For any other errors, still show the auth pages
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {children}
      </div>
    );
  }
} 