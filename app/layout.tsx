import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../app/styles/globals.css';
import Header from '@/components/Header';
import { createClient } from '@/utils/supabase/server';
import UserProvider from '@/components/UserProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Telloom',
  description: 'Bridging Generations through Video Storytelling',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  // Fetch the authenticated user on the server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;

  if (user) {
    const { data: profileData, error } = await supabase
      .from('Profile') // Ensure the table name matches your database
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      profile = profileData;

      // Generate signed URL for avatar if avatarUrl exists
      if (profile.avatarUrl) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('avatars')
          .createSignedUrl(profile.avatarUrl, 60 * 60 * 24 * 7); // URL valid for 7 days

        if (signedUrlError) {
          console.error('Error creating signed URL for avatar:', signedUrlError);
        } else {
          profile.avatarImageUrl = signedUrlData.signedUrl;
        }
      }
    }
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Initialize user and profile state on the client */}
        <UserProvider initialUser={user} initialProfile={profile}>
          <Header />
          <main>{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}