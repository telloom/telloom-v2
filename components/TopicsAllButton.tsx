// components/TopicsAllButton.tsx
// This component renders a button that links to the "View All Topics" page

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ViewAllTopicsButton() {
  return (
    <Link href="/role-sharer/topics">
      <Button className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white">
        View All Topics
      </Button>
    </Link>
  );
}

