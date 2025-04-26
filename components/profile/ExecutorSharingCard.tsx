'use client';

import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Define the prop types expected by this component
interface ExecutorRelationshipProps {
  executorRelationship: {
    id: string;
    sharerId: string;
    executorId: string;
    sharer: {
      id: string;
      profileId: string;
      profile: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string | null;
        createdAt?: string; // Ensure createdAt is optional
      };
    };
  };
}

export default function ExecutorSharingCard({ executorRelationship }: ExecutorRelationshipProps) {
  const { sharer } = executorRelationship;
  const profile = sharer.profile;
  
  const displayName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
  const initials = `${profile.firstName?.charAt(0) || ''}${profile.lastName?.charAt(0) || ''}`.trim();

  return (
    <Link href={`/role-executor/${executorRelationship.sharerId}`} className="block group h-full"> 
      <Card className="relative border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 h-full flex"> 
        {/* Vertically centered arrow wrapper */}
        <div className="absolute top-1/2 right-6 transform -translate-y-1/2 z-10"> {/* Adjusted right-6 */}
          <svg
            className="h-6 w-6 text-gray-400 group-hover:text-[#1B4332] group-hover:translate-x-1 transition-transform duration-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3" 
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
        {/* CardHeader takes full width, centers content vertically */}
        <CardHeader className="pl-6 pt-6 pb-6 pr-16 flex w-full"> {/* Added pl-6, adjusted pr-16, keep pt/pb-6 */}
          <div className="flex items-center gap-4"> 
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile.avatarUrl || ''} alt={displayName} />
              <AvatarFallback className="bg-[#1B4332] text-white">{initials || '??'}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{displayName || 'Sharer Name'}</CardTitle>
              <CardDescription className="text-sm">{profile.email || 'No email'}</CardDescription>
            </div>
          </div>
        </CardHeader>
        {/* CardContent remains removed */}
      </Card>
    </Link>
  );
} 