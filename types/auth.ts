// auth.ts
/**
 * Defines types related to authentication and authorization within the application.
 * Includes interfaces for the authentication context, token payloads, and props for
 * protected routes.
 * 
 * As your app grows, you might add more types here to handle additional authentication
 * mechanisms, user roles, or permissions.
 */

import { Role, Profile } from '@/types/models';

export interface AuthContextType {
  user: Profile | null;
  isAuthenticated: boolean;
  roles: Role[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export interface ProtectedRouteProps {
  roles?: Role[];
  children: React.ReactNode;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  roles: Role[];
  exp: number;
  iat: number;
}