'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, UserCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const requestFollowSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type RequestFollowFormData = z.infer<typeof requestFollowSchema>

interface SharerProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
  sharerId: string
}

export default function RequestFollowForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [foundSharer, setFoundSharer] = useState<SharerProfile | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const form = useForm<RequestFollowFormData>({
    resolver: zodResolver(requestFollowSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onBlur'
  })

  const searchSharer = async (email: string): Promise<SharerProfile | null> => {
    console.log('[searchSharer] Initiated with email:', email);
    const isValid = await form.trigger('email');
    if (!isValid) {
        setFoundSharer(null);
        toast.info("Please enter a valid email address.");
        console.log('[searchSharer] Email validation failed.');
        return null;
    }

    setIsSearching(true);
    setFoundSharer(null); // Clear previous before new search
    console.log('[searchSharer] State reset: isSearching=true, foundSharer=null');
    const normalizedEmail = email.toLowerCase().trim();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to continue');
        console.log('[searchSharer] User not signed in.');
        return null;
      }

      console.log('[searchSharer] Calling RPC search_sharer_by_email for:', normalizedEmail);
      const { data: sharerData, error: rpcError } = await supabase
        .rpc('search_sharer_by_email', { 
          p_email: normalizedEmail,
          p_requestor_id: user.id 
        });

      if (rpcError) {
        console.error('[searchSharer] RPC error:', rpcError);
        toast.error('An error occurred while searching');
        return null;
      }

      if (!sharerData) {
        console.log('[searchSharer] RPC returned no sharerData. Checking Profile table.');
        const { data: existingProfile } = await supabase
          .from('Profile')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (!existingProfile) {
          toast.error('No user found with that email address.');
          console.log('[searchSharer] No profile found with that email.');
        } else {
          toast.info('This user cannot be requested at this time. They may not be a sharer, or you might already be connected or have a pending request.');
          console.log('[searchSharer] Profile found, but not requestable via RPC.');
        }
        return null; // Explicitly return null if sharerData is null
      }

      console.log('[searchSharer] Sharer found via RPC:', sharerData);
      setFoundSharer(sharerData as SharerProfile); // Set state for UI
      return sharerData as SharerProfile; // Return the found profile
    } catch (error) {
      console.error('[searchSharer] Unexpected error:', error);
      toast.error('An error occurred while searching');
      return null;
    } finally {
      setIsSearching(false);
      console.log('[searchSharer] State update: isSearching=false');
    }
  }

  // Renamed from onSubmit: Handles the actual submission logic
  const performSubmit = async () => {
    console.log('[performSubmit] Initiated. Current foundSharer state:', foundSharer);
    if (!foundSharer) {
      console.error("[performSubmit] Aborted: foundSharer is null!");
      toast.error("Cannot send request, sharer not selected.");
      return;
    }

    setIsLoading(true);
    let createdFollowRequest: any = null; // Variable to hold the created request

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!user || userError) {
        toast.error('Please sign in to send a follow request');
        setIsLoading(false);
        return;
      }

      // --- Create Follow Request ---
      console.log(`Attempting to create follow request for sharerId: ${foundSharer.sharerId}`);
      const { data: followRequest, error: requestError } = await supabase
        .from('FollowRequest')
        .insert({
          sharerId: foundSharer.sharerId, // ProfileSharer.id
          requestorId: user.id,
          status: 'PENDING'
        })
        .select()
        .single();

      if (requestError) {
        console.error('Error creating follow request:', requestError);
        if (requestError.code === '23505') { // Unique constraint violation
          toast.error('You already have a pending request for this sharer.');
        } else {
          // Attempt to provide more specific feedback if possible
          toast.error(`Failed to send follow request: ${requestError.message || 'Please try again.'}`);
        }
        setIsLoading(false); // Stop loading on error
        return; // Stop execution if request fails
      }

      createdFollowRequest = followRequest; // Store the created request for notification step
      console.log('FollowRequest created successfully:', createdFollowRequest);

      // --- Insert Notification Directly (Replaces API call) ---
      if (createdFollowRequest) {
          const sharerProfileId = foundSharer.id; // RPC returns Profile.id as 'id'
          const requestorName = `${user.user_metadata?.firstName || ''} ${user.user_metadata?.lastName || ''}`.trim() || user.email || 'Someone';
          const notificationMessage = `${requestorName} has requested to follow you.`;
          const notificationData = {
            followRequestId: createdFollowRequest.id,
            requestorId: user.id,
            requestorName: requestorName,
          };

          console.log('[Notification Insert] Attempting insert with payload:', {
              userId: sharerProfileId,
              type: 'FOLLOW_REQUEST_RECEIVED',
              message: notificationMessage,
              data: notificationData,
          });

          const { error: notificationError } = await supabase
            .from('Notification')
            .insert({
              userId: sharerProfileId, // The Sharer's Profile.id
              type: 'FOLLOW_REQUEST_RECEIVED',
              message: notificationMessage,
              data: notificationData,
              isRead: false,
            });

          if (notificationError) {
              console.error('Error inserting notification directly:', notificationError);
              // Inform user request succeeded, but notification failed (non-blocking)
              toast.warning('Follow request sent, but there was an issue creating the notification for the sharer.');
          } else {
              console.log('Notification inserted successfully.');
              toast.success(`Follow request sent to ${foundSharer.firstName}`);
          }
      } else {
            // Should not happen if request insert succeeded, but log just in case
            console.warn('FollowRequest was created, but data is missing for notification step.');
            toast.warning('Follow request sent, but notification step was skipped due to missing data.');
      }

      // --- Reset Form and Refresh ---
      form.reset();
      setFoundSharer(null);
      router.refresh();

    } catch (error) {
      console.error('Error during follow request submission process:', error);
      toast.error('An unexpected error occurred while sending the request');
    } finally {
      setIsLoading(false);
    }
  }

  // This function decides whether to search or submit based on current state
  const handleFormAction = async (data: RequestFollowFormData) => {
    console.log('[handleFormAction] Clicked. Current foundSharer state:', foundSharer, 'Form data email:', data.email);
    if (foundSharer) { // If sharer is already displayed (state is set from blur or previous search click)
      console.log('[handleFormAction] Sharer already found in state. Proceeding to submit.');
      await performSubmit();
    } else { // If no sharer is displayed (button was "Search Sharer")
      console.log('[handleFormAction] No sharer in state. Calling searchSharer from button click.');
      await searchSharer(data.email); // Search and update state. UI will change.
                                      // User clicks again on the (now) "Send" button.
      console.log('[handleFormAction] searchSharer from button click finished. UI should reflect result.');
    }
  };

  const handleEmailBlur = async () => {
    const email = form.getValues('email');
    const isValid = await form.trigger('email');
    console.log('[handleEmailBlur] Fired. Email:', email, 'isValid:', isValid, 'Current foundSharer:', foundSharer, 'isSearching:', isSearching);

    if (email && isValid && !foundSharer && !isSearching) { // Only search on blur if not already found and not already searching
      console.log('[handleEmailBlur] Conditions met, calling searchSharer.');
      await searchSharer(email);
    } else {
      console.log('[handleEmailBlur] Conditions NOT met for search. Clearing foundSharer if email is invalid/empty.');
      if (!email || !isValid) {
        setFoundSharer(null); // Clear if email becomes invalid/empty
      }
    }
  };

  return (
    <div>
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormAction)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sharer&apos;s Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter their email address" 
                      {...field} 
                      onBlur={handleEmailBlur}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-[#1B4332]" />
              </div>
            )}

            {foundSharer && !isSearching && (
              <div className="border-2 border-[#1B4332] rounded-lg p-4 space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    {foundSharer.avatarUrl ? (
                      <AvatarImage src={foundSharer.avatarUrl} alt={`${foundSharer.firstName}'s avatar`} />
                    ) : (
                      <AvatarFallback>
                        <UserCircle className="h-8 w-8" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{foundSharer.firstName} {foundSharer.lastName}</h3>
                    <p className="text-sm text-muted-foreground">{foundSharer.email}</p>
                  </div>
                </div>
              </div>
            )}

            <Button 
              type="submit"
              className="w-full rounded-full bg-[#1B4332] hover:bg-[#8fbc55]"
              disabled={
                isSearching || isLoading
                // (!foundSharer && !form.formState.isValid && form.formState.isSubmitted)
              }
            >
              {/* Conditional Rendering for Button Content */}
              {isLoading && (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Request...
                </>
              )}
              {isSearching && !isLoading && (
                 <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              )}
              {foundSharer && !isLoading && !isSearching && (
                'Send Follow Request'
              )}
              {!foundSharer && !isLoading && !isSearching && (
                'Search Sharer'
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
} 