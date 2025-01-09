'use client';

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/utils/auth';
import { Role } from '@/types/models';
import { useEffect, useState } from 'react';

interface UserRole {
  role: Role;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { user, roles } = await getAuthenticatedUser();
        
        // Find the user's role
        const userRole = roles.find((r: UserRole) => [Role.SHARER, Role.LISTENER, Role.EXECUTOR, Role.ADMIN].includes(r.role))?.role;

        if (!userRole) {
          redirect('/role-selection');
          return;
        }

        if (userRole === Role.SHARER) {
          redirect('/role-sharer/topics');
        } else if (userRole === Role.LISTENER) {
          redirect('/role-listener/sharers');
        } else if (userRole === Role.EXECUTOR) {
          redirect('/role-executor/sharers');
        } else if (userRole === Role.ADMIN) {
          redirect('/admin/dashboard');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        redirect('/login');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1B4332] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
}
