'use client';

import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch notifications');
  }
  return res.json();
};

export default function NotificationsBadge() {
  const { data, error } = useSWR('/api/notifications?count=true', fetcher, {
    refreshInterval: 15000, // Refresh every 15 seconds
  });

  // Don't show badge if there's an error, no data, or unreadCount is 0 or undefined
  if (error || !data || !data.unreadCount || data.unreadCount === 0) return null;

  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1B4332] text-[10px] font-medium text-white">
      {data.unreadCount > 99 ? '99+' : data.unreadCount}
    </span>
  );
} 