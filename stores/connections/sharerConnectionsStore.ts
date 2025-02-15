import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export interface Connection {
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
}

export interface Invitation {
  id: string;
  sharerId: string;
  inviterId: string;
  inviteeEmail: string;
  role: 'LISTENER' | 'EXECUTOR';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  token: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  emailSent?: boolean;
  executorFirstName?: string;
  executorLastName?: string;
  executorRelation?: string;
  executorPhone?: string;
}

export interface FollowRequest {
  id: string;
  requestorId: string;
  sharerId: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED';
  createdAt: string;
  updatedAt: string;
  requestor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
}

interface SharerConnectionsStore {
  connections: Connection[];
  invitations: Invitation[];
  followRequests: FollowRequest[];
  pastFollowRequests: FollowRequest[];
  isLoading: boolean;
  error: string | null;
  
  // Fetch operations
  fetchConnections: () => Promise<void>;
  fetchInvitations: () => Promise<void>;
  fetchFollowRequests: () => Promise<void>;
  fetchPastFollowRequests: () => Promise<void>;
  
  // Invitation operations
  sendInvitation: (data: {
    email: string;
    role: 'LISTENER' | 'EXECUTOR';
    firstName?: string;
    lastName?: string;
    relation?: string;
    phone?: string;
  }) => Promise<void>;
  cancelInvitation: (id: string) => Promise<void>;
  resendInvitation: (id: string) => Promise<void>;
  
  // Connection operations
  revokeAccess: (connectionId: string) => Promise<void>;
  restoreAccess: (connectionId: string) => Promise<void>;
  removeConnection: (connectionId: string) => Promise<void>;
}

export const useSharerConnectionsStore = create<SharerConnectionsStore>((set, get) => ({
  connections: [],
  invitations: [],
  followRequests: [],
  pastFollowRequests: [],
  isLoading: false,
  error: null,

  fetchConnections: async () => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Get the user's ProfileSharer record
      const { data: sharer, error: sharerError } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', user.id)
        .single();

      if (sharerError) throw sharerError;

      // Fetch all connections (listeners and executors)
      const [{ data: listeners }, { data: executors }] = await Promise.all([
        supabase
          .from('ProfileListener')
          .select(`
            id,
            sharedSince,
            hasAccess,
            Profile:listenerId (
              id,
              email,
              firstName,
              lastName,
              avatarUrl
            )
          `)
          .eq('sharerId', sharer.id),
        supabase
          .from('ProfileExecutor')
          .select(`
            id,
            Profile:executorId (
              id,
              email,
              firstName,
              lastName,
              avatarUrl
            )
          `)
          .eq('sharerId', sharer.id)
      ]);

      // Combine and format connections
      const formattedConnections: Connection[] = [
        ...(listeners?.map((l: { id: string; sharedSince: string; hasAccess: boolean; Profile: Connection['profile'] }) => ({
          id: l.id,
          role: 'LISTENER' as const,
          profile: l.Profile,
          sharedSince: l.sharedSince,
          hasAccess: l.hasAccess,
        })) || []),
        ...(executors?.map((e: { id: string; Profile: Connection['profile'] }) => ({
          id: e.id,
          role: 'EXECUTOR' as const,
          profile: e.Profile,
        })) || [])
      ];

      set({ connections: formattedConnections, isLoading: false });
    } catch (error) {
      console.error('Error fetching connections:', error);
      set({ error: 'Failed to fetch connections', isLoading: false });
      toast.error('Failed to fetch connections');
    }
  },

  fetchInvitations: async () => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { data: invitations, error } = await supabase
        .from('Invitation')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;

      set({ invitations, isLoading: false });
    } catch (error) {
      console.error('Error fetching invitations:', error);
      set({ error: 'Failed to fetch invitations', isLoading: false });
      toast.error('Failed to fetch invitations');
    }
  },

  fetchFollowRequests: async () => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Get the user's ProfileSharer ID
      const { data: profileSharer, error: profileSharerError } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', user.id)
        .single();

      if (profileSharerError) {
        console.error('ProfileSharer error:', profileSharerError);
        throw new Error('No ProfileSharer found');
      }

      console.log('Fetching follow requests for ProfileSharer:', profileSharer.id);
      
      const { data: requests, error: requestsError } = await supabase
        .from('FollowRequest')
        .select(`
          *,
          requestor:Profile (
            id,
            firstName,
            lastName,
            email,
            avatarUrl
          )
        `)
        .eq('sharerId', profileSharer.id)
        .eq('status', 'PENDING');

      if (requestsError) {
        console.error('Error fetching follow requests:', requestsError);
        throw requestsError;
      }

      console.log('Raw follow requests:', requests);
      if (requests && requests.length > 0) {
        console.log('First request data:', JSON.stringify(requests[0], null, 2));
        console.log('First request requestorId:', requests[0].requestorId);
      }

      set({ followRequests: requests || [], isLoading: false });
    } catch (error) {
      console.error('Error in fetchFollowRequests:', error);
      set({ error: 'Failed to fetch follow requests', isLoading: false });
      toast.error('Failed to fetch follow requests');
    }
  },

  fetchPastFollowRequests: async () => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Get the user's ProfileSharer ID
      const { data: profileSharer, error: profileSharerError } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', user.id)
        .single();

      if (profileSharerError) {
        console.error('ProfileSharer error:', profileSharerError);
        throw new Error('No ProfileSharer found');
      }
      
      const { data: requests, error: requestsError } = await supabase
        .from('FollowRequest')
        .select(`
          *,
          requestor:Profile (
            id,
            firstName,
            lastName,
            email,
            avatarUrl
          )
        `)
        .eq('sharerId', profileSharer.id)
        .in('status', ['REVOKED', 'DENIED'])
        .order('updatedAt', { ascending: false });

      if (requestsError) {
        console.error('Error fetching past follow requests:', requestsError);
        throw requestsError;
      }

      set({ pastFollowRequests: requests || [], isLoading: false });
    } catch (error) {
      console.error('Error in fetchPastFollowRequests:', error);
      set({ error: 'Failed to fetch past follow requests', isLoading: false });
      toast.error('Failed to fetch past follow requests');
    }
  },

  sendInvitation: async ({ email, role, firstName, lastName, relation, phone }) => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) {
        throw new Error('No authenticated user');
      }

      const { data: sharer } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', profile.user.id)
        .single();

      if (!sharer) {
        throw new Error('User is not a sharer');
      }

      const now = new Date().toISOString();
      const { data: invitation, error: insertError } = await supabase
        .from('Invitation')
        .insert([{
          sharerId: sharer.id,
          inviterId: profile.user.id,
          inviteeEmail: email,
          role,
          status: 'PENDING',
          token: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...(role === 'EXECUTOR' ? {
            executorFirstName: firstName,
            executorLastName: lastName,
            executorRelation: relation,
            executorPhone: phone,
          } : {})
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Send the invitation email
      const response = await fetch('/api/invitations/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitation.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation email');
      }

      set(state => ({
        invitations: [invitation, ...state.invitations],
        isLoading: false
      }));

      toast.success('Invitation sent successfully');
    } catch (error) {
      console.error('Error sending invitation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  cancelInvitation: async (id: string) => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase
        .from('Invitation')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        invitations: state.invitations.filter(inv => inv.id !== id),
        isLoading: false
      }));

      toast.success('Invitation cancelled successfully');
    } catch (error) {
      console.error('Error canceling invitation:', error);
      set({ error: 'Failed to cancel invitation', isLoading: false });
      toast.error('Failed to cancel invitation');
    }
  },

  resendInvitation: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/invitations/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend invitation');
      }

      toast.success('Invitation resent successfully');
      set({ isLoading: false });
    } catch (error) {
      console.error('Error resending invitation:', error);
      set({ error: 'Failed to resend invitation', isLoading: false });
      toast.error('Failed to resend invitation');
    }
  },

  revokeAccess: async (connectionId: string) => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase
        .from('ProfileListener')
        .update({ hasAccess: false })
        .eq('id', connectionId);

      if (error) throw error;

      set(state => ({
        connections: state.connections.map(conn =>
          conn.id === connectionId
            ? { ...conn, hasAccess: false }
            : conn
        ),
        isLoading: false
      }));

      toast.success('Access revoked successfully');
    } catch (error) {
      console.error('Error revoking access:', error);
      set({ error: 'Failed to revoke access', isLoading: false });
      toast.error('Failed to revoke access');
    }
  },

  restoreAccess: async (connectionId: string) => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase
        .from('ProfileListener')
        .update({ hasAccess: true })
        .eq('id', connectionId);

      if (error) throw error;

      set(state => ({
        connections: state.connections.map(conn =>
          conn.id === connectionId
            ? { ...conn, hasAccess: true }
            : conn
        ),
        isLoading: false
      }));

      toast.success('Access restored successfully');
    } catch (error) {
      console.error('Error restoring access:', error);
      set({ error: 'Failed to restore access', isLoading: false });
      toast.error('Failed to restore access');
    }
  },

  removeConnection: async (connectionId: string) => {
    try {
      const supabase = createClient();
      
      // First get the connection details to find the listener
      const { data: connection, error: connectionError } = await supabase
        .from('ProfileListener')
        .select('listenerId, sharerId')
        .eq('id', connectionId)
        .single();

      if (connectionError) throw connectionError;

      // Delete the ProfileListener record
      const { error: deleteError } = await supabase
        .from('ProfileListener')
        .delete()
        .eq('id', connectionId);

      if (deleteError) throw deleteError;

      // Update any associated follow request to REVOKED status
      if (connection) {
        const { error: updateError } = await supabase
          .from('FollowRequest')
          .update({
            status: 'REVOKED',
            updatedAt: new Date().toISOString()
          })
          .eq('requestorId', connection.listenerId)
          .eq('sharerId', connection.sharerId)
          .eq('status', 'APPROVED');

        if (updateError) throw updateError;
      }

      // Refresh the connections list
      await get().fetchConnections();
      toast.success('Connection removed successfully');
    } catch (error) {
      console.error('Error removing connection:', error);
      toast.error('Failed to remove connection');
    }
  },
})); 