'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Connection {
  id: string;
  role: 'LISTENER' | 'EXECUTOR';
  profile: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
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

  useEffect(() => {
    const fetchConnections = async () => {
      const supabase = createClient();
      setIsLoading(true);
      setError(null);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Fetch listeners
        const { data: listeners, error: listenersError } = await supabase
          .from('ProfileListener')
          .select(`
            id,
            sharedSince,
            hasAccess,
            Profile:Profile (
              id,
              email,
              firstName,
              lastName
            )
          `)
          .eq('sharerId', sharerId);

        if (listenersError) throw listenersError;

        // Fetch executor
        const { data: executor, error: executorError } = await supabase
          .from('ProfileExecutor')
          .select(`
            id,
            Profile:Profile (
              id,
              email,
              firstName,
              lastName
            )
          `)
          .eq('sharerId', sharerId)
          .single();

        if (executorError) throw executorError;

        // Combine and format the data
        const formattedConnections: Connection[] = [
          ...(listeners?.map(l => ({
            id: l.id,
            role: 'LISTENER' as const,
            profile: l.Profile,
            sharedSince: l.sharedSince,
            hasAccess: l.hasAccess,
            isCurrentUser: l.Profile.id === user.id
          })) || []),
          {
            id: executor.id,
            role: 'EXECUTOR' as const,
            profile: executor.Profile,
            isCurrentUser: executor.Profile.id === user.id
          }
        ];

        setConnections(formattedConnections);
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
      const supabase = createClient();
      
      // First get the connection details for the notification
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) throw new Error('Connection not found');

      // Delete the connection
      const { error } = await supabase
        .from('ProfileListener')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      // Create notification for the sharer
      await supabase.from('Notification').insert({
        userId: sharerId,
        type: 'CONNECTION_CHANGE',
        message: `Executor removed listener ${connection.profile.firstName} ${connection.profile.lastName}`,
        data: {
          action: 'REMOVED',
          role: 'LISTENER',
          executorAction: true
        }
      });

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
                  {connection.profile.firstName} {connection.profile.lastName}
                  {connection.isCurrentUser && (
                    <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                  )}
                </td>
                <td className="py-3 px-4">{connection.profile.email}</td>
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
              <div>
                <h4 className="font-medium">
                  {connection.profile.firstName} {connection.profile.lastName}
                  {connection.isCurrentUser && (
                    <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                  )}
                </h4>
                <p className="text-sm text-muted-foreground break-all">
                  {connection.profile.email}
                </p>
                <span className="text-xs capitalize bg-muted px-2 py-1 rounded-full">
                  {connection.role.toLowerCase()}
                </span>
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