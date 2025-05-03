import { create } from 'zustand';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase/client'; // Keep for actions, but not for fetching lists

// Define interfaces (consider moving to a types file)
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
  sharedSince?: string; // Optional for EXECUTOR
  hasAccess?: boolean; // Optional for EXECUTOR
}

interface Invitation {
  id: string;
  inviteeEmail: string;
  role: 'LISTENER' | 'EXECUTOR';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  createdAt: string;
  sharerId: string; // Keep relevant fields
  inviterId: string;
  // Add other fields if needed by the UI
}

interface FollowRequest {
  id: string;
  requestor: Profile;
  createdAt: string;
  sharerId: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  // Add other fields if needed by the UI
}

interface SharerConnectionsStore {
  connections: Connection[];
  invitations: Invitation[];
  followRequests: FollowRequest[];
  // pastFollowRequests: FollowRequest[]; // Removed for now, add back if needed
  isLoadingConnections: boolean;
  isLoadingInvitations: boolean;
  isLoadingFollowRequests: boolean;
  error: string | null;

  // Fetch operations
  fetchConnections: () => Promise<void>;
  fetchInvitations: () => Promise<void>;
  fetchFollowRequests: () => Promise<void>;
  // fetchPastFollowRequests: () => Promise<void>; // Removed

  // Actions (these can still use supabase client or dedicated API routes)
  approveFollowRequest: (requestId: string) => Promise<void>; // Example action
  denyFollowRequest: (requestId: string) => Promise<void>; // Example action
  cancelInvitation: (invitationId: string) => Promise<void>; // Example action
  removeConnection: (connectionId: string, role: 'LISTENER' | 'EXECUTOR') => Promise<void>; // Add removeConnection
  // Add other actions as needed
}

export const useSharerConnectionsStore = create<SharerConnectionsStore>((set, get) => ({
  connections: [],
  invitations: [],
  followRequests: [],
  isLoadingConnections: false,
  isLoadingInvitations: false,
  isLoadingFollowRequests: false,
  error: null,

  // --- Fetch using API Routes --- 

  fetchConnections: async () => {
    set({ isLoadingConnections: true, error: null });
    try {
      const response = await fetch('/api/sharer/connections/active');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch connections');
      }
      const data = await response.json();
      set({ connections: data.connections || [], isLoadingConnections: false });
    } catch (error) {
      console.error('Error fetching connections via API:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch connections';
      set({ error: message, isLoadingConnections: false });
      toast.error(message);
    }
  },

  fetchInvitations: async () => {
    set({ isLoadingInvitations: true, error: null });
    try {
      const response = await fetch('/api/sharer/connections/invitations');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch invitations');
      }
      const data = await response.json();
      set({ invitations: data.invitations || [], isLoadingInvitations: false });
    } catch (error) {
      console.error('Error fetching invitations via API:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch invitations';
      set({ error: message, isLoadingInvitations: false });
      toast.error(message);
    }
  },

  fetchFollowRequests: async () => {
    set({ isLoadingFollowRequests: true, error: null });
    try {
      const response = await fetch('/api/sharer/connections/requests');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch follow requests');
      }
      const data = await response.json();
      set({ followRequests: data.followRequests || [], isLoadingFollowRequests: false });
    } catch (error) {
      console.error('Error fetching follow requests via API:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch follow requests';
      set({ error: message, isLoadingFollowRequests: false });
      toast.error(message);
    }
  },

  // --- Actions (Example implementations - refine as needed) --- 

  approveFollowRequest: async (requestId: string) => {
    // Option 1: Use existing RPC via client
    // Option 2: Create a dedicated API route app/api/sharer/connections/requests/approve
    try {
      const supabaseClient = supabase; // Use client for action
      const { error } = await supabaseClient
        .rpc('handle_follow_request_response', { // Ensure this RPC checks sharer auth
          request_id: requestId,
          should_approve: true
        });
      if (error) throw error;
      toast.success('Follow request approved');
      get().fetchFollowRequests(); // Re-fetch list
      // TODO: Consider API call to notify requestor
    } catch (error: any) {
      console.error('[Sharer Store] Error approving follow request:', error);
      toast.error(error.message || 'Failed to approve follow request');
    }
  },

  denyFollowRequest: async (requestId: string) => {
    try {
      const supabaseClient = supabase; // Use client for action
      const { error } = await supabaseClient
        .rpc('handle_follow_request_response', { // Ensure this RPC checks sharer auth
          request_id: requestId,
          should_approve: false
        });
      if (error) throw error;
      toast.success('Follow request denied');
      get().fetchFollowRequests(); // Re-fetch list
    } catch (error: any) {
      console.error('[Sharer Store] Error denying follow request:', error);
      toast.error(error.message || 'Failed to deny follow request');
    }
  },

  cancelInvitation: async (invitationId: string) => {
     // Needs an API route or direct client call with RLS check
     set({ isLoadingInvitations: true });
     try {
        // Example: using direct client (ensure RLS is correct for DELETE)
        // const supabaseClient = supabase;
        // const { data: { user } } = await supabaseClient.auth.getUser();
        // if (!user) throw new Error('Unauthorized');

        // const { error } = await supabaseClient
        //   .from('Invitation')
        //   .delete()
        //   .eq('id', invitationId)
        //   .eq('inviterId', user.id); // Crucial check

        // OR preferably, use an API route:
        const response = await fetch(`/api/sharer/connections/invitations?invitationId=${invitationId}`, {
           method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to cancel invitation');
        }

       toast.success('Invitation cancelled');
       get().fetchInvitations(); // Re-fetch
     } catch (error: any) {
       console.error('[Sharer Store] Error cancelling invitation:', error);
       toast.error(error.message || 'Failed to cancel invitation');
       set({ isLoadingInvitations: false }); // Ensure loading state is reset on error
     }
   },

  removeConnection: async (connectionId: string, role: 'LISTENER' | 'EXECUTOR') => {
    set({ isLoadingConnections: true }); // Use the connection loading state
    try {
      const response = await fetch(`/api/sharer/connections/${connectionId}?role=${role}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove connection');
      }

      toast.success(`${role === 'LISTENER' ? 'Listener' : 'Executor'} removed successfully`);
      get().fetchConnections(); // Re-fetch active connections list

    } catch (error: any) {
      console.error(`[Sharer Store] Error removing ${role} connection:`, error);
      toast.error(error.message || `Failed to remove ${role === 'LISTENER' ? 'listener' : 'executor'}`);
      set({ isLoadingConnections: false, error: error.message }); // Update error state
    } finally {
      set({ isLoadingConnections: false }); // Ensure loading state is reset
    }
  },

})); 