// components/PageTitle.tsx
// Simple component to display a page title with consistent styling

import React from 'react';

interface PageTitleProps {
  title: string;
  subtitle?: string;
}

export function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <div className="mb-6"> {/* Add margin-bottom for spacing */}
      <h1 className="text-2xl md:text-3xl font-semibold text-[#1B4332]">{title}</h1>
      {subtitle && (
        <p className="text-sm md:text-base text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
} 