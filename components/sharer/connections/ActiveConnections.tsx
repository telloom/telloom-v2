/**
 * File: components/sharer/connections/ActiveConnections.tsx
 * Description: Component that displays active connections for a sharer
 */

'use client';

import { useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Loader2, UserX, ShieldOff, ShieldCheck, X } from 'lucide-react';
import { useSharerConnectionsStore } from '@/stores/connections/sharerConnectionsStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ActiveConnections() {
  const { 
    connections, 
    isLoading, 
    error, 
    fetchConnections, 
    revokeAccess, 
    restoreAccess,
    removeConnection 
  } = useSharerConnectionsStore();

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

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
      <div className="rounded-md border">
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
              <tr key={connection.id} className="border-b">
                <td className="py-3 px-4">
                  {connection.profile.firstName} {connection.profile.lastName}
                </td>
                <td className="py-3 px-4">{connection.profile.email}</td>
                <td className="py-3 px-4 capitalize">{connection.role.toLowerCase()}</td>
                <td className="py-3 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeConnection(connection.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {connections.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 px-4 text-center text-muted-foreground">
                  No active connections
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 