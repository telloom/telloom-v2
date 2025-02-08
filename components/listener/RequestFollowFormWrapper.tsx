'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const RequestFollowForm = dynamic(
  () => import('./RequestFollowForm'),
  { ssr: false }
);

export function RequestFollowFormWrapper() {
  return (
    <Suspense fallback={<div className="w-full h-32 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
    </div>}>
      <RequestFollowForm />
    </Suspense>
  );
} 