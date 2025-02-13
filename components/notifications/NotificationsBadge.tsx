'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NotificationsBadge() {
  const { data, error } = useSWR('/api/notifications?count=true', fetcher, {
    refreshInterval: 15000, // Refresh every 15 seconds
  });

  if (error || !data || data.unreadCount === 0) return null;

  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1B4332] text-[10px] font-medium text-white">
      {data.unreadCount > 99 ? '99+' : data.unreadCount}
    </span>
  );
} 