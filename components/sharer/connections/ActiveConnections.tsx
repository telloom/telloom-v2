/**
 * File: components/sharer/connections/ActiveConnections.tsx
 * Description: Component that displays active connections for a sharer
 */

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
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
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

// Define Connection interface locally or import from store
interface Profile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

interface Connection {
  id: string;
  role: 'LISTENER' | 'EXECUTOR';
  profile: Profile;
  sharedSince?: string;
  hasAccess?: boolean;
}

export default function ActiveConnections() {
  const { 
    connections, 
    isLoading, 
    error, 
    fetchConnections, 
    removeConnection 
  } = useSharerConnectionsStore();

  // State for confirmation dialog
  const [connectionToRemove, setConnectionToRemove] = useState<Connection | null>(null);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleRemoveClick = (connection: Connection) => {
    setConnectionToRemove(connection);
    // Dialog trigger will open the modal
  };

  const handleConfirmRemove = () => {
    if (connectionToRemove) {
      removeConnection(connectionToRemove.id, connectionToRemove.role);
      setConnectionToRemove(null); // Close dialog implicitly after action
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
    <AlertDialog onOpenChange={(open) => !open && setConnectionToRemove(null)}> 
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
                <tr key={connection.id} className="border-b">
                  <td className="py-3 px-4">
                    {connection.profile.firstName} {connection.profile.lastName}
                  </td>
                  <td className="py-3 px-4">{connection.profile.email}</td>
                  <td className="py-3 px-4 capitalize">{connection.role.toLowerCase()}</td>
                  <td className="py-3 px-4 text-right">
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveClick(connection)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
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
              className="border rounded-lg p-4 space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">
                    {connection.profile.firstName} {connection.profile.lastName}
                  </h4>
                  <p className="text-sm text-muted-foreground break-all">
                    {connection.profile.email}
                  </p>
                  <span className="text-xs capitalize bg-muted px-2 py-1 rounded-full">
                    {connection.role.toLowerCase()}
                  </span>
                </div>
                <AlertDialogTrigger asChild>
                   <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveClick(connection)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Dialog Content */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently remove 
            <strong className="px-1">
              {connectionToRemove?.profile.firstName} {connectionToRemove?.profile.lastName}
            </strong>
            {connectionToRemove?.role === 'LISTENER' && ' as a listener.'}
            {connectionToRemove?.role === 'EXECUTOR' && ' as an executor.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={() => setConnectionToRemove(null)} 
            className="rounded-full"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmRemove} 
            className="bg-red-600 hover:bg-red-700 rounded-full"
          >
            Confirm Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 