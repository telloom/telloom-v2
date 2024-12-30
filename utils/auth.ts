import { getUser } from '@/utils/supabase/server';
import { Role } from '@/types/models';
import { redirect } from 'next/navigation';

export async function getAuthenticatedUser() {
  const { user, roles, error } = await getUser();
  
  if (error || !user) {
    redirect('/login');
  }
  
  return { user, roles };
}

export async function checkRole(requiredRole: Role) {
  const { user, roles } = await getAuthenticatedUser();
  
  // Admin has access to everything
  if (roles.some(r => r.role === Role.ADMIN)) {
    return { user, roles };
  }
  
  // Check for specific required role
  if (!roles.some(r => r.role === requiredRole)) {
    redirect('/unauthorized');
  }
  
  return { user, roles };
}

export async function checkRoles(requiredRoles: Role[]) {
  const { user, roles } = await getAuthenticatedUser();
  
  // Admin has access to everything
  if (roles.some(r => r.role === Role.ADMIN)) {
    return { user, roles };
  }
  
  // Check if user has any of the required roles
  if (!roles.some(r => requiredRoles.includes(r.role as Role))) {
    redirect('/unauthorized');
  }
  
  return { user, roles };
} 