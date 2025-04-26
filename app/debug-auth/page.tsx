'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { supabase } from '@/utils/supabase/client';

export default function DebugAuthPage() {
  const { user, loading, refreshUser, checkServerSession } = useAuth();
  const [serverSession, setServerSession] = useState<any>(null);
  const [isLoadingServer, setIsLoadingServer] = useState(false);
  const [jwtData, setJwtData] = useState<any>(null);
  const [isLoadingJwt, setIsLoadingJwt] = useState(false);

  // Function to fetch server session
  const fetchServerSession = async () => {
    try {
      setIsLoadingServer(true);
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      setServerSession(data);
    } catch (error) {
      console.error('Error fetching server session:', error);
    } finally {
      setIsLoadingServer(false);
    }
  };

  // Function to fetch JWT data
  const fetchJwtData = async () => {
    try {
      setIsLoadingJwt(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching JWT data:', error);
        return;
      }
      
      if (session) {
        setJwtData({
          jwt: session.access_token?.substring(0, 20) + '...',
          user: session.user,
          expires_at: new Date(session.expires_at! * 1000).toISOString(),
        });
      } else {
        setJwtData(null);
      }
    } catch (error) {
      console.error('Error fetching JWT data:', error);
    } finally {
      setIsLoadingJwt(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchServerSession();
    fetchJwtData();
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold">Authentication Debug</h1>
        
        <div className="space-y-6">
          {/* Auth Provider State */}
          <div className="border p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Auth Provider State</h2>
            <div className="space-y-2">
              <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
              <div><strong>Has User:</strong> {user ? 'Yes' : 'No'}</div>
              {user && (
                <>
                  <div><strong>User ID:</strong> {user.id}</div>
                  <div><strong>Email:</strong> {user.email}</div>
                  <div><strong>Roles (JWT):</strong> {JSON.stringify(user.app_metadata?.roles || [])}</div>
                </>
              )}
            </div>
            <div className="mt-4">
              <Button onClick={() => refreshUser()} disabled={loading}>
                Refresh Auth Provider
              </Button>
            </div>
          </div>

          {/* Server Session */}
          <div className="border p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Server Session (/api/auth/session)</h2>
            <div className="space-y-2">
              <div><strong>Has Session:</strong> {serverSession?.session ? 'Yes' : 'No'}</div>
              {serverSession?.session?.user && (
                <>
                  <div><strong>User ID:</strong> {serverSession.session.user.id}</div>
                  <div><strong>Email:</strong> {serverSession.session.user.email}</div>
                </>
              )}
              {serverSession?.error && (
                <div className="text-red-500"><strong>Error:</strong> {serverSession.error}</div>
              )}
            </div>
            <div className="mt-4">
              <Button onClick={fetchServerSession} disabled={isLoadingServer}>
                {isLoadingServer ? 'Loading...' : 'Refresh Server Session'}
              </Button>
            </div>
          </div>

          {/* JWT Data */}
          <div className="border p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">JWT Data (Client)</h2>
            <div className="space-y-2">
              <div><strong>Has JWT:</strong> {jwtData ? 'Yes' : 'No'}</div>
              {jwtData && (
                <>
                  <div><strong>JWT (partial):</strong> {jwtData.jwt}</div>
                  <div><strong>Expires At:</strong> {jwtData.expires_at}</div>
                  <div><strong>User ID:</strong> {jwtData.user?.id}</div>
                  <div><strong>Email:</strong> {jwtData.user?.email}</div>
                </>
              )}
            </div>
            <div className="mt-4">
              <Button onClick={fetchJwtData} disabled={isLoadingJwt}>
                {isLoadingJwt ? 'Loading...' : 'Refresh JWT Data'}
              </Button>
            </div>
          </div>

          {/* Auth Operations */}
          <div className="border p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Auth Operations</h2>
            <div className="flex space-x-4">
              <Button
                onClick={() => checkServerSession()}
                variant="secondary"
                disabled={loading}
              >
                Check Server Session
              </Button>
              
              <Button
                onClick={async () => {
                  try {
                    await supabase.auth.refreshSession();
                    await refreshUser();
                    await fetchServerSession();
                    await fetchJwtData();
                  } catch (error) {
                    console.error('Error refreshing session:', error);
                  }
                }}
                variant="secondary"
                disabled={loading}
              >
                Refresh Session
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 