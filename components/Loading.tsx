import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
      <Loader2 className="h-8 w-8 animate-spin text-[#1B4332]" />
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  );
} 