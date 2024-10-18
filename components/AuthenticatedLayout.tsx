// components/AuthenticatedLayout.tsx
// This component provides a layout wrapper for authenticated pages, including a common header

import React from 'react';
import Header from './Header';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}

