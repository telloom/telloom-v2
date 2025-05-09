/**
 * File: components/listener/connections/ActiveSharings.tsx
 * Description: Component that displays sharers that the listener is following
 */

'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, X } from 'lucide-react';
import { useListenerConnectionsStore } from '@/stores/connections/listenerConnectionsStore';
import { getInitials } from '@/lib/utils';

export default function Following() {
  const { sharers, isLoading, error, fetchSharings, unfollowSharer } = useListenerConnectionsStore();

  useEffect(() => {
    fetchSharings();
  }, [fetchSharings]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  if (!sharers?.length) {
    return (
      <div className="text-center text-gray-500 p-4">
        You are not following any sharers
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop view */}
      <div className="hidden md:block rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-3 px-4 text-left w-[48px]"></th>
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Following Since</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sharers.map((sharer) => (
              <tr key={sharer.id} className="border-b">
                <td className="py-3 px-4">
                  <Avatar className="h-8 w-8">
                    {sharer.profile.avatarUrl ? (
                      <AvatarImage
                        src={sharer.profile.avatarUrl}
                        alt={`${sharer.profile.firstName || ''}'s avatar`}
                      />
                    ) : (
                      <AvatarFallback>
                        {getInitials(sharer.profile.firstName || '', sharer.profile.lastName || '')}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </td>
                <td className="py-3 px-4">
                  {sharer.profile.firstName} {sharer.profile.lastName}
                </td>
                <td className="py-3 px-4">{sharer.profile.email}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    sharer.hasAccess 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {sharer.hasAccess ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {format(new Date(sharer.sharedSince), 'MMM d, yyyy')}
                </td>
                <td className="py-3 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => unfollowSharer(sharer.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4">
        {sharers.map((sharer) => (
          <div
            key={sharer.id}
            className="border rounded-lg p-4 space-y-2"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  {sharer.profile.avatarUrl ? (
                    <AvatarImage
                      src={sharer.profile.avatarUrl}
                      alt={`${sharer.profile.firstName || ''}'s avatar`}
                    />
                  ) : (
                    <AvatarFallback>
                      {getInitials(sharer.profile.firstName || '', sharer.profile.lastName || '')}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h4 className="font-medium">
                    {sharer.profile.firstName} {sharer.profile.lastName}
                  </h4>
                  <p className="text-sm text-muted-foreground break-all">
                    {sharer.profile.email}
                  </p>
                  <div className="flex flex-col gap-1 mt-2">
                    <span className={`text-xs inline-block w-fit px-2 py-0.5 rounded-full ${
                      sharer.hasAccess 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {sharer.hasAccess ? 'Active' : 'Revoked'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Following since {format(new Date(sharer.sharedSince), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => unfollowSharer(sharer.id)}
                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 