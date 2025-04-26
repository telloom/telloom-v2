'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

interface JwtData {
  user: {
    id: string;
    email: string;
    email_confirmed_at: string;
    created_at: string;
    updated_at: string;
  };
  app_metadata: any;
  user_metadata: any;
  jwt_claims: any;
  full_jwt_data: any;
  jwt_validation: {
    jwtRoles: string[];
    dbRoles: string[];
    match: boolean;
    jwtData: any;
    dbData: any;
  };
  decoded_jwt: {
    header: any;
    payload: any;
    error?: string;
  };
  timestamp: string;
}

export default function DebugJwtPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [jwtData, setJwtData] = useState<JwtData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJwtData() {
      try {
        setIsLoading(true);
        
        // Get session token from Supabase
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError('No active session found');
          setIsLoading(false);
          return;
        }
        
        // Call our debug API with the token
        const response = await fetch('/api/debug-jwt', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch JWT data');
        }
        
        const data = await response.json();
        setJwtData(data);
      } catch (err: any) {
        console.error('Error fetching JWT data:', err);
        setError(err.message || 'Failed to fetch JWT data');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchJwtData();
  }, []);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">JWT Debug Information</h1>
      
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
          {error}
        </div>
      )}
      
      {jwtData && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <h2 className="text-xl font-semibold mb-2">User Information</h2>
              <div className="bg-gray-50 p-4 rounded-md overflow-auto">
                <pre className="text-sm">{JSON.stringify(jwtData.user, null, 2)}</pre>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-2">App Metadata (JWT Claims)</h2>
              <div className="bg-gray-50 p-4 rounded-md overflow-auto">
                <pre className="text-sm">{JSON.stringify(jwtData.app_metadata, null, 2)}</pre>
              </div>
            </section>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-2">JWT Data From RPC</h2>
            <div className="bg-gray-50 p-4 rounded-md overflow-auto">
              <pre className="text-sm">{JSON.stringify(jwtData.jwt_claims, null, 2)}</pre>
            </div>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-2">User Metadata</h2>
            <div className="bg-gray-50 p-4 rounded-md overflow-auto">
              <pre className="text-sm">{JSON.stringify(jwtData.user_metadata, null, 2)}</pre>
            </div>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-2">Decoded Raw JWT</h2>
            <div className="bg-gray-50 p-4 rounded-md overflow-auto">
              {jwtData.decoded_jwt.error ? (
                <div className="text-red-500">{jwtData.decoded_jwt.error}</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-1">Header:</h3>
                    <pre className="text-sm">{JSON.stringify(jwtData.decoded_jwt.header, null, 2)}</pre>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Payload:</h3>
                    <pre className="text-sm">{JSON.stringify(jwtData.decoded_jwt.payload, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-2">JWT vs Database Validation</h2>
            <div className="bg-gray-50 p-4 rounded-md overflow-auto">
              <div className="mb-3">
                <span className="font-medium">Roles Match: </span>
                <span className={jwtData.jwt_validation.match ? "text-green-600" : "text-red-600"}>
                  {jwtData.jwt_validation.match ? "✓ Yes" : "✗ No"}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-1">JWT Roles:</h3>
                  <pre className="text-sm">{JSON.stringify(jwtData.jwt_validation.jwtRoles, null, 2)}</pre>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Database Roles:</h3>
                  <pre className="text-sm">{JSON.stringify(jwtData.jwt_validation.dbRoles, null, 2)}</pre>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="mb-2">
                  <h3 className="font-medium">JWT Data:</h3>
                  <pre className="text-sm">{JSON.stringify(jwtData.jwt_validation.jwtData, null, 2)}</pre>
                </div>
                <div>
                  <h3 className="font-medium">Database Data:</h3>
                  <pre className="text-sm">{JSON.stringify(jwtData.jwt_validation.dbData, null, 2)}</pre>
                </div>
              </div>
            </div>
          </section>
          
          <div className="text-sm text-gray-500 text-right">
            Generated at: {new Date(jwtData.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
} 