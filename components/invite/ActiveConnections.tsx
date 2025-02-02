/**
 * File: components/invite/ActiveConnections.tsx
 * Description: Component that displays active listeners and executors
 */

'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

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
}

export default function ActiveConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConnections = async () => {
      const supabase = createClient();
      setIsLoading(true);
      setError(null);

      try {
        // Get the current user's ProfileSharer record
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');

        const { data: sharer, error: sharerError } = await supabase
          .from('ProfileSharer')
          .select('id')
          .eq('profileId', user.id)
          .single();

        if (sharerError) throw sharerError;

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
          .eq('sharerId', sharer.id);

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
          .eq('sharerId', sharer.id)
          .maybeSingle();

        if (executorError) throw executorError;

        // Combine and format the data
        const formattedConnections: Connection[] = [
          ...(listeners?.map(l => ({
            id: l.id,
            role: 'LISTENER' as const,
            profile: l.Profile,
            sharedSince: l.sharedSince,
            hasAccess: l.hasAccess,
          })) || []),
          ...(executor ? [{
            id: executor.id,
            role: 'EXECUTOR' as const,
            profile: executor.Profile,
          }] : []),
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
  }, []);

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
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Connected Since</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections.map((connection) => (
              <TableRow key={connection.id}>
                <TableCell>
                  {connection.profile.firstName} {connection.profile.lastName}
                </TableCell>
                <TableCell>{connection.profile.email}</TableCell>
                <TableCell>
                  <Badge variant={connection.role === 'EXECUTOR' ? 'default' : 'secondary'}>
                    {connection.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {connection.role === 'LISTENER' && (
                    <Badge variant={connection.hasAccess ? 'success' : 'destructive'}>
                      {connection.hasAccess ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                  {connection.role === 'EXECUTOR' && (
                    <Badge variant="success">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {connection.sharedSince && format(new Date(connection.sharedSince), 'MMM d, yyyy')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 