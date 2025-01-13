import { useUserStore } from '@/stores/userStore';
import { Role } from '@/types/models';

export function useHasRole(role: Role): boolean {
  const profile = useUserStore((state) => state.profile);
  return profile?.roles?.some((r) => r.role === role) ?? false;
}

export function useHasAnyRole(roles: Role[]): boolean {
  const profile = useUserStore((state) => state.profile);
  return profile?.roles?.some((r) => roles.includes(r.role)) ?? false;
}

export function useUserRoles(): Role[] {
  const profile = useUserStore((state) => state.profile);
  return profile?.roles?.map((r) => r.role) ?? [];
} 