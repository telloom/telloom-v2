// src/components/VideoNavigation.tsx
import React from 'react';
import Link from 'next/link';

const VideoNavigation: React.FC = () => {
  return (
    <nav className="bg-gray-100 p-4 mb-6">
      <ul className="flex space-x-4">
        <li>
          <Link href="/videos" className="text-blue-500 hover:text-blue-700">
            All Videos
          </Link>
        </li>
        <li>
          <Link href="/videos/upload" className="text-blue-500 hover:text-blue-700">
            Upload Video
          </Link>
        </li>
        <li>
          <Link href="/videos/record" className="text-blue-500 hover:text-blue-700">
            Record Video
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default VideoNavigation;