// app/role-sharer/layout.tsx
// This layout component ensures that the user is authenticated and has the SHARER role before rendering the children components.

import { getAuthenticatedUser, getUserRole } from '@/utils/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import SupabaseListener from '@/components/SupabaseListener';

export default async function RoleSharerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      redirect('/login');
    }

    const role = await getUserRole();
    if (role !== 'SHARER') {
      redirect('/unauthorized');
    }

    return (
      <div className="min-h-screen flex flex-col">
        <SupabaseListener />
        <Header />
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  } catch (error) {
    console.error('Error in RoleSharerLayout:', error);
    redirect('/login');
  }
}
