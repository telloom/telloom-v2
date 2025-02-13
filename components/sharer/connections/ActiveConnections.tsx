/**
 * File: components/sharer/connections/ActiveConnections.tsx
 * Description: Component that displays active connections for a sharer
 */

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { useSharerConnectionsStore } from '@/stores/connections/sharerConnectionsStore';

export default function ActiveConnections() {
  const { 
    connections, 
    isLoading, 
    error, 
    fetchConnections, 
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeConnection(connection.id)}
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