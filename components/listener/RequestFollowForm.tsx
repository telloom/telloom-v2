'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

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

  const form = useForm<RequestFollowFormData>({
    resolver: zodResolver(requestFollowSchema),
    defaultValues: {
      email: '',
    },
  })

  const searchSharer = async (email: string) => {
    setIsSearching(true)
    const normalizedEmail = email.toLowerCase().trim()
    
    try {
      // Get current user for context
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to continue')
        return null
      }

      // Direct profile lookup with RLS
      const { data: profile, error: profileError } = await supabase
        .from('Profile')
        .select(`
          id,
          firstName,
          lastName,
          email,
          avatarUrl,
          ProfileSharer:ProfileSharer (
            id
          )
        `)
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (profileError) {
        console.error('Profile search error:', profileError)
        toast.error('An error occurred while searching')
        return null
      }

      if (!profile) {
        toast.error('No user found with that email address')
        return null
      }

      // Check if they have a ProfileSharer record
      const sharerProfile = profile.ProfileSharer?.[0]
      if (!sharerProfile) {
        toast.error('This user is not a sharer')
        return null
      }

      const sharerData = {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        sharerId: sharerProfile.id
      };
      
      setFoundSharer(sharerData)
      return sharerData
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error('An error occurred while searching')
      return null
    } finally {
      setIsSearching(false)
    }
  }

  const onSubmit = async (data: RequestFollowFormData) => {
    setIsLoading(true);
    try {
      // Get current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (!user || userError) {
        toast.error('Please sign in to send a follow request');
        return;
      }

      // If we don't have a foundSharer yet, search for them
      let currentSharer = foundSharer;
      if (!currentSharer) {
        const searchResult = await searchSharer(data.email);
        if (!searchResult) {
          setIsLoading(false);
          return;
        }
        currentSharer = searchResult;
      }

      // Create the follow request
      const { data: followRequest, error: requestError } = await supabase
        .from('FollowRequest')
        .insert({
          sharerId: currentSharer.sharerId,
          requestorId: user.id,
          status: 'PENDING'
        })
        .select()
        .single();

      if (requestError) {
        console.error('Error creating follow request:', requestError);
        if (requestError.code === '23505') {
          toast.error('You already have a pending request for this sharer');
        } else {
          toast.error('Failed to send follow request');
        }
        return;
      }

      // Send notification
      const notifyResponse = await fetch('/api/follow-request/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: followRequest.id,
        }),
      });

      if (!notifyResponse.ok) {
        console.error('Failed to send notification');
      }

      toast.success(`Follow request sent to ${currentSharer.firstName}`);
      form.reset();
      setFoundSharer(null);
    } catch (error) {
      console.error('Error sending follow request:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailBlur = async () => {
    const email = form.getValues('email')
    if (email && form.formState.isValid) {
      await searchSharer(email)
    }
  }

  return (
    <div>
      <div className="px-6 pt-6">
        <h2 className="text-xl font-semibold text-black">Request to Follow</h2>
      </div>
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      disabled={isLoading || isSearching}
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

            {foundSharer && (
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
              disabled={isLoading || isSearching || !form.formState.isValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Request...
                </>
              ) : foundSharer ? (
                'Send Follow Request'
              ) : (
                'Search Sharer'
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
} 