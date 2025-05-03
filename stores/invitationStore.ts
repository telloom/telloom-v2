import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

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

interface InvitationStore {
  invitations: Invitation[];
  isLoading: boolean;
  error: string | null;
  fetchInvitations: () => Promise<void>;
  sendInvitation: (data: {
    email: string;
    role: 'LISTENER' | 'EXECUTOR';
    firstName?: string;
    lastName?: string;
    relation?: string;
    phone?: string;
  }) => Promise<void>;
  cancelInvitation: (id: string) => Promise<void>;
}

export const useInvitationStore = create<InvitationStore>((set, get) => ({
  invitations: [],
  isLoading: false,
  error: null,

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

  sendInvitation: async ({ email, role, firstName, lastName, relation, phone }) => {
    const supabase = createClient();
    set({ isLoading: true, error: null });

    try {
      console.log('[invitationStore sendInvitation] Starting...');
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) {
        console.error('[invitationStore sendInvitation] Error: No authenticated user found.');
        throw new Error('No authenticated user');
      }
      console.log(`[invitationStore sendInvitation] Authenticated user ID: ${profile.user.id}`);

      // Attempt to find the sharer profile ID using the new RPC function
      console.log(`[invitationStore sendInvitation] Calling RPC get_sharer_id_for_invitation for profileId: ${profile.user.id}`);
      const { data: sharerId, error: rpcError } = await supabase
        .rpc('get_sharer_id_for_invitation', {
          p_profile_id: profile.user.id
        });

      if (rpcError) {
        console.error(`[invitationStore sendInvitation] Error calling RPC get_sharer_id_for_invitation for user ${profile.user.id}:`, rpcError);
        throw new Error(`Database error fetching sharer ID via RPC: ${rpcError.message}`);
      }

      if (!sharerId) {
        console.error(`[invitationStore sendInvitation] RPC get_sharer_id_for_invitation returned null for user ${profile.user.id}. User is not a sharer.`);
        throw new Error('User is not a sharer');
      }

      console.log(`[invitationStore sendInvitation] Found Sharer ID via RPC: ${sharerId} for user: ${profile.user.id}`);

      // Check if the invitee already has a profile using the safe RPC
      console.log(`[invitationStore sendInvitation] Checking existing profile for invitee: ${email} via RPC`);
      const { data: existingProfileId, error: profileCheckError } = await supabase
        .rpc('get_profile_id_by_email_safe', { p_email: email.toLowerCase() });

      if (profileCheckError) {
        console.error(`[invitationStore sendInvitation] Error calling RPC get_profile_id_by_email_safe for email ${email}:`, profileCheckError);
        // Handle the error appropriately - maybe throw, maybe just log and continue
        // For now, let's throw to make the failure explicit
        throw new Error(`Database error checking for existing profile via RPC: ${profileCheckError.message}`);
      }
      console.log(`[invitationStore sendInvitation] Existing profile check complete via RPC. Found profile ID: ${existingProfileId || 'null'}`);

      // Call the safe RPC function to create the invitation
      console.log(`[invitationStore sendInvitation] Calling RPC create_invitation_safe for invitee: ${email}, role: ${role}, sharerId: ${sharerId}`);
      const { data: invitation, error: rpcInsertError } = await supabase
        .rpc('create_invitation_safe', {
          p_invitee_email: email,
          p_role: role,
          p_sharer_id: sharerId,
          // Pass executor details only if role is EXECUTOR and no existing profile was found
          p_executor_first_name: (role === 'EXECUTOR' && !existingProfileId) ? firstName : null,
          p_executor_last_name: (role === 'EXECUTOR' && !existingProfileId) ? lastName : null,
          p_executor_relation: (role === 'EXECUTOR' && !existingProfileId) ? relation : null,
          p_executor_phone: (role === 'EXECUTOR' && !existingProfileId) ? phone : null
        });

      if (rpcInsertError) {
         console.error(`[invitationStore sendInvitation] Error calling RPC create_invitation_safe:`, rpcInsertError);
        throw new Error(`Database error creating invitation via RPC: ${rpcInsertError.message}`);
      }

      if (!invitation || !invitation.id) { // Check if the RPC returned a valid invitation object
          console.error(`[invitationStore sendInvitation] RPC create_invitation_safe did not return a valid invitation object.`);
          throw new Error('Failed to create invitation record.');
      }
      
      console.log(`[invitationStore sendInvitation] Invitation created via RPC with ID: ${invitation.id}`);

      // Send the invitation email (using the ID from the RPC response)
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
  }
})); 