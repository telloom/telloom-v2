// components/listener/ListenerSharingCard.tsx
// Displays a card representing a Sharer that the Listener follows.

import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Define the structure expected by this card
// Ensure this matches the data fetched in role-listener/page.tsx
interface ListenerRelationship {
  id: string; // ProfileListener.id
  listenerId: string;
  sharerId: string; // ProfileSharer.id
  sharer: {
    id: string; // ProfileSharer.id
    profileId: string; // Profile.id of the Sharer
    profile: {
      id: string; // Profile.id
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl: string | null;
    };
  };
  // Add other fields from the RPC if needed
}

interface ListenerSharingCardProps {
  listenerRelationship: ListenerRelationship;
}

export default function ListenerSharingCard({ listenerRelationship }: ListenerSharingCardProps) {
  const { sharer } = listenerRelationship;
  const sharerProfile = sharer.profile;
  const sharerName = `${sharerProfile.firstName || ''} ${sharerProfile.lastName || ''}`.trim();
  const sharerInitials = `${sharerProfile.firstName?.charAt(0) || ''}${sharerProfile.lastName?.charAt(0) || ''}`.trim();

  const sharerLink = `/role-listener/${sharer.id}/topics`; // Using ProfileSharer.id

  return (
    <Link href={sharerLink} passHref className="block group h-full">
      <Card className="relative border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 h-full flex cursor-pointer">
        <div className="absolute top-1/2 right-6 transform -translate-y-1/2 z-10">
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
        <CardHeader className="pl-6 pt-6 pb-6 pr-16 flex w-full">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={sharerProfile.avatarUrl || ''} alt={sharerName} />
              <AvatarFallback className="bg-[#1B4332] text-white">{sharerInitials || '??'}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg truncate">{sharerName || 'Sharer Name'}</CardTitle>
              <CardDescription className="text-sm truncate">{sharerProfile.email || 'No email'}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
} 