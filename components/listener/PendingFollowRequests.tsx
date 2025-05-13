'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PendingRequest {
  id: string;
  status: string;
  createdAt: string;
  sharer: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl: string | null;
    };
  };
}

interface PendingFollowRequestsProps {
  requests: PendingRequest[];
  title?: string;
}

export default function PendingFollowRequests({ requests, title }: PendingFollowRequestsProps) {
  return (
    <Card className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
      {title && (
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-black">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={`p-4 ${!title ? 'pt-4' : 'pt-2'}`}>
        <div className="space-y-1">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  {request.sharer.profile.avatarUrl ? (
                    <AvatarImage
                      src={request.sharer.profile.avatarUrl}
                      alt={`${request.sharer.profile.firstName}'s avatar`}
                    />
                  ) : (
                    <AvatarFallback>
                      <UserCircle className="h-5 w-5" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="font-semibold text-black text-sm truncate">
                    {request.sharer.profile.firstName} {request.sharer.profile.lastName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{request.sharer.profile.email}</span>
                    <span className="hidden sm:inline">
                      <span className="mx-1 sm:mx-2">•</span>
                      Requested {formatDistanceToNow(new Date(request.createdAt))} ago
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-xs shrink-0">
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                  Pending
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 