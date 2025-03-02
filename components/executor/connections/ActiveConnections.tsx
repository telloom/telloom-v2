'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSignedAvatarUrl } from '@/utils/avatar';

interface Connection {
  id: string;
  role: 'LISTENER' | 'EXECUTOR';
  profile: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  sharedSince?: string;
  hasAccess?: boolean;
  isCurrentUser?: boolean;
}

interface ActiveConnectionsProps {
  sharerId: string;
  role: 'EXECUTOR';
}

export default function ActiveConnections({ sharerId, role }: ActiveConnectionsProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedAvatarUrls, setSignedAvatarUrls] = useState<Record<string, string | null>>({});

  // Fetch signed URLs for avatars
  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls: Record<string, string | null> = {};
      
      for (const connection of connections) {
        if (connection.profile.avatarUrl && !urls[connection.profile.avatarUrl]) {
          urls[connection.profile.avatarUrl] = await getSignedAvatarUrl(connection.profile.avatarUrl);
        }
      }
      
      setSignedAvatarUrls(urls);
    };
    
    if (connections.length > 0) {
      fetchSignedUrls();
    }
  }, [connections]);

  useEffect(() => {
    const fetchConnections = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/connections?sharerId=${sharerId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch connections');
        }

        const data = await response.json();
        console.log('Fetched connections:', data.connections);
        setConnections(data.connections);
      } catch (error) {
        console.error('Error fetching connections:', error);
        setError('Failed to fetch connections');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnections();
  }, [sharerId]);

  const handleRemoveConnection = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/connections?connectionId=${connectionId}&sharerId=${sharerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove connection');
      }

      setConnections(prev => prev.filter(c => c.id !== connectionId));
      toast.success('Connection removed successfully');
    } catch (error) {
      console.error('Error removing connection:', error);
      toast.error('Failed to remove connection');
    }
  };

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

  if (!connections.length) {
    return (
      <div className="text-center text-gray-500 p-4">
        No active connections
      </div>
    );
  }

  // Helper function to get the signed URL for an avatar
  const getAvatarUrl = (originalUrl: string | null): string | null => {
    if (!originalUrl) return null;
    return signedAvatarUrls[originalUrl] || originalUrl;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Active Connections</h3>

      {/* Desktop view */}
      <div className="hidden md:block rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Role</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((connection) => (
              <tr 
                key={connection.id} 
                className={cn(
                  "border-b",
                  connection.isCurrentUser && "bg-muted/20"
                )}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={getAvatarUrl(connection.profile.avatarUrl) || undefined}
                        alt={`${connection.profile.firstName || 'User'}'s avatar`}
                      />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span>
                        {connection.profile.firstName || ''} {connection.profile.lastName || ''}
                      </span>
                      {connection.isCurrentUser && (
                        <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">{connection.profile.email || 'No email'}</td>
                <td className="py-3 px-4 capitalize">
                  {connection.role.toLowerCase()}
                </td>
                <td className="py-3 px-4 text-right">
                  {connection.role === 'LISTENER' && !connection.isCurrentUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveConnection(connection.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4">
        {connections.map((connection) => (
          <div
            key={connection.id}
            className={cn(
              "border rounded-lg p-4 space-y-2",
              connection.isCurrentUser && "bg-muted/20"
            )}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={getAvatarUrl(connection.profile.avatarUrl) || undefined}
                    alt={`${connection.profile.firstName || 'User'}'s avatar`}
                  />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">
                    {connection.profile.firstName || ''} {connection.profile.lastName || ''}
                    {connection.isCurrentUser && (
                      <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground break-all">
                    {connection.profile.email || 'No email'}
                  </p>
                  <span className="text-xs capitalize bg-muted px-2 py-1 rounded-full">
                    {connection.role.toLowerCase()}
                  </span>
                </div>
              </div>
              {connection.role === 'LISTENER' && !connection.isCurrentUser && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveConnection(connection.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 