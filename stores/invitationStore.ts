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

      // Check if the invitee already has a profile
      const { data: existingProfile } = await supabase
        .from('Profile')
        .select('firstName, lastName')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      const now = new Date().toISOString();
      const { data: invitation, error: insertError } = await supabase
        .from('Invitation')
        .insert([{
          sharerId: sharer.id,
          inviterId: profile.user.id,
          inviteeEmail: email.toLowerCase(),
          role,
          status: 'PENDING',
          token: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...(role === 'EXECUTOR' && !existingProfile ? {
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
  }
})); 