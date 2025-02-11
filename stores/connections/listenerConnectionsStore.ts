import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export interface Sharer {
  id: string;
  profile: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  sharedSince: string;
  hasAccess: boolean;
}

export interface FollowRequest {
  id: string;
  sharerId: string;
  requestorId: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  deniedAt?: string;
  sharer: {
    profile: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
    };
  };
}

interface ListenerConnectionsStore {
  sharers: Sharer[];
  followRequests: FollowRequest[];
  isLoading: boolean;
  error: string | null;
  
  // Fetch operations
  fetchSharings: () => Promise<void>;
  fetchFollowRequests: () => Promise<void>;
  
  // Follow request operations
  sendFollowRequest: (email: string) => Promise<void>;
  cancelFollowRequest: (id: string) => Promise<void>;
  
  // Connection operations
  unfollowSharer: (sharerId: string) => Promise<void>;
}

export const useListenerConnectionsStore = create<ListenerConnectionsStore>((set) => ({
  sharers: [],
  followRequests: [],
  isLoading: false,
  error: null,

  fetchSharings: async () => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: sharings, error } = await supabase
        .from('ProfileListener')
        .select(`
          id,
          sharedSince,
          hasAccess,
          ProfileSharer!inner (
            id,
            Profile (
              id,
              email,
              firstName,
              lastName,
              avatarUrl
            )
          )
        `)
        .eq('listenerId', user.id);

      if (error) throw error;

      const formattedSharings: Sharer[] = sharings.map(sharing => ({
        id: sharing.ProfileSharer.id,
        profile: sharing.ProfileSharer.Profile,
        sharedSince: sharing.sharedSince,
        hasAccess: sharing.hasAccess,
      }));

      set({ sharers: formattedSharings, isLoading: false });
    } catch (error) {
      console.error('Error fetching sharings:', error);
      set({ error: 'Failed to fetch sharings', isLoading: false });
      toast.error('Failed to fetch sharings');
    }
  },

  fetchFollowRequests: async () => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: requests, error } = await supabase
        .from('FollowRequest')
        .select(`
          *,
          ProfileSharer (
            Profile (
              id,
              email,
              firstName,
              lastName,
              avatarUrl
            )
          )
        `)
        .eq('requestorId', user.id)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      const formattedRequests: FollowRequest[] = requests.map(request => ({
        ...request,
        sharer: {
          profile: request.ProfileSharer.Profile
        }
      }));

      set({ followRequests: formattedRequests, isLoading: false });
    } catch (error) {
      console.error('Error fetching follow requests:', error);
      set({ error: 'Failed to fetch follow requests', isLoading: false });
      toast.error('Failed to fetch follow requests');
    }
  },

  sendFollowRequest: async (email: string) => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // First, find the sharer's profile by email
      const { data: sharerProfile, error: profileError } = await supabase
        .from('Profile')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError) throw new Error('Sharer not found');

      // Then, get the ProfileSharer record
      const { data: sharer, error: sharerError } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', sharerProfile.id)
        .single();

      if (sharerError) throw new Error('Sharer not found');

      // Check if a follow request already exists
      const { data: existingRequest, error: checkError } = await supabase
        .from('FollowRequest')
        .select('id')
        .eq('sharerId', sharer.id)
        .eq('requestorId', user.id)
        .single();

      if (existingRequest) {
        throw new Error('Follow request already exists');
      }

      // Create the follow request
      const { data: request, error: insertError } = await supabase
        .from('FollowRequest')
        .insert([{
          sharerId: sharer.id,
          requestorId: user.id,
          status: 'PENDING',
        }])
        .select(`
          *,
          ProfileSharer (
            Profile (
              id,
              email,
              firstName,
              lastName,
              avatarUrl
            )
          )
        `)
        .single();

      if (insertError) throw insertError;

      const formattedRequest: FollowRequest = {
        ...request,
        sharer: {
          profile: request.ProfileSharer.Profile
        }
      };

      set(state => ({
        followRequests: [formattedRequest, ...state.followRequests],
        isLoading: false
      }));

      toast.success('Follow request sent successfully');
    } catch (error) {
      console.error('Error sending follow request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send follow request';
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  cancelFollowRequest: async (id: string) => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase
        .from('FollowRequest')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        followRequests: state.followRequests.filter(req => req.id !== id),
        isLoading: false
      }));

      toast.success('Follow request cancelled successfully');
    } catch (error) {
      console.error('Error cancelling follow request:', error);
      set({ error: 'Failed to cancel follow request', isLoading: false });
      toast.error('Failed to cancel follow request');
    }
  },

  unfollowSharer: async (sharerId: string) => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('ProfileListener')
        .delete()
        .eq('listenerId', user.id)
        .eq('sharerId', sharerId);

      if (error) throw error;

      set(state => ({
        sharers: state.sharers.filter(sharer => sharer.id !== sharerId),
        isLoading: false
      }));

      toast.success('Unfollowed successfully');
    } catch (error) {
      console.error('Error unfollowing sharer:', error);
      set({ error: 'Failed to unfollow sharer', isLoading: false });
      toast.error('Failed to unfollow sharer');
    }
  },
})); 