'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function IndexPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push('/login');
        return;
      }

      const { data: roles } = await supabase
        .from('ProfileRole')
        .select('role')
        .eq('profileId', user.id);

      if (!roles || roles.length === 0) {
        router.push('/select-role');
        return;
      }

      // Redirect based on the user's role
      const role = roles[0].role;
      switch (role) {
        case 'ADMIN':
          router.push('/role-admin/topics');
          break;
        case 'SHARER':
          router.push('/role-sharer/topics');
          break;
        case 'EXECUTOR':
          router.push('/role-executor/topics');
          break;
        case 'LISTENER':
          router.push('/role-listener/topics');
          break;
        default:
          router.push('/select-role');
      }
    };

    checkUser();
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-lg">
        Please wait while we check your profile...
      </div>
    </div>
  );
}
