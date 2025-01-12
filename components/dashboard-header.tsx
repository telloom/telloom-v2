/**
 * File: components/dashboard-header.tsx
 * Description: A dashboard-specific header component that displays personalized welcome message
 * and navigation options for authenticated users. Designed to be used in dashboard layouts
 * and requires a ProfileSharer object for user context.
 */

'use client';

import { ProfileSharer as Sharer } from '@/types/models';

interface DashboardHeaderProps {
  sharer: Sharer;
}

export default function DashboardHeader({ sharer }: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 shadow-md">
      {/* Dashboard-specific header content */}
      <div>
        <h1>Welcome, {sharer.profile.firstName}</h1>
      </div>
    </header>
  );
} 