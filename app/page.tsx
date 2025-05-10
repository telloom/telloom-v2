// 'use client'; // This will be moved to the IndexPageContent component

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

import { Suspense } from 'react';
import IndexPageContent from './index-page-content'; // Import the new client component

// Define a simple loading component for the Suspense fallback
function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-lg">
        Loading page...
      </div>
    </div>
  );
}

// The main page component, now simplified to use Suspense and the imported client component
export default function IndexPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <IndexPageContent />
    </Suspense>
  );
}
