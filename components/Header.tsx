// components/Header.tsx

'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UserAvatar from '@/components/UserAvatar';
import { createClient } from '@/utils/supabase/client';
import { useUserStore } from '@/stores/userStore';

export default function Header() {
  const supabase = createClient();
  const router = useRouter();

  const user = useUserStore((state) => state.user);
  const profile = useUserStore((state) => state.profile);
  const setUser = useUserStore((state) => state.setUser);
  const setProfile = useUserStore((state) => state.setProfile);

  useEffect(() => {
    // Listen for auth state changes (login, logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch profile data
        const { data: profileData, error } = await supabase
          .from('Profile')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setProfile(null);
        } else {
          setProfile(profileData);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, setUser, setProfile]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      setUser(null);
      setProfile(null);
      router.replace('/login');
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 shadow-md">
      <div>
        <Image
          src="/images/Telloom Logo V1-Horizontal Green.png"
          alt="Telloom Logo"
          width={120}
          height={32}
        />
      </div>
      {user ? (
        <div className="flex items-center space-x-3">
          <span className="text-sm">
            Welcome, {profile?.firstName || user.email}
          </span>
          <UserAvatar
            avatarUrl={profile?.avatarUrl ?? null}
            firstName={profile?.firstName}
            lastName={profile?.lastName}
          />
          <div>
            <Link href="/profile">Profile</Link>
            <Button onClick={handleSignOut}>Logout</Button>
          </div>
        </div>
      ) : (
        <div>
          <Link href="/login">Login</Link>
        </div>
      )}
    </header>
  );
}