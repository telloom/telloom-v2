/**
 * File: components/executor/connections/ExecutorInviteModal.tsx
 * Description: Modal component for Executors to invite Listeners or other Executors on behalf of a Sharer.
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from '@/utils/supabase/client';

const personRelations = [
  'Spouse', 'Partner', 'Mother', 'Father', 'Sister', 'Brother', 'Daughter', 'Son',
  'Grandmother', 'Grandfather', 'GreatGrandmother', 'GreatGrandfather',
  'Granddaughter', 'Grandson', 'GreatGranddaughter', 'GreatGrandson',
  'Aunt', 'Uncle', 'GreatAunt', 'GreatUncle', 'Niece', 'Nephew', 'Cousin',
  'Friend', 'Coworker', 'Mentor', 'Teacher', 'Boss',
  'MotherInLaw', 'FatherInLaw', 'SisterInLaw', 'BrotherInLaw',
  'StepMother', 'StepFather', 'StepSister', 'StepBrother', 'StepDaughter', 'StepSon',
  'Godmother', 'Godfather', 'Godchild', 'Other'
] as const;

const baseFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const listenerFormSchema = baseFormSchema;

const executorFormSchema = baseFormSchema.extend({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  relation: z.enum(personRelations, {
    required_error: 'Please select a relation',
  }),
  phone: z.string().min(1, 'Phone number is required'),
});

type ListenerFormValues = z.infer<typeof listenerFormSchema>;
type ExecutorFormValues = z.infer<typeof executorFormSchema>;

interface ExecutorInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sharerId: string;
}

interface SharerDetails {
  profile_first_name?: string | null;
  profile_last_name?: string | null;
}

export default function ExecutorInviteModal({ 
  open, 
  onOpenChange, 
  sharerId, 
}: ExecutorInviteModalProps) {
  const [activeTab, setActiveTab] = useState<"listener" | "executor">("listener");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedSharerName, setFetchedSharerName] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const supabase = createClient();

  const listenerForm = useForm<ListenerFormValues>({
    resolver: zodResolver(listenerFormSchema),
    defaultValues: {
      email: '',
    },
  });

  const executorForm = useForm<ExecutorFormValues>({
    resolver: zodResolver(executorFormSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      relation: undefined,
      phone: '',
    },
  });

  useEffect(() => {
    listenerForm.reset();
    executorForm.reset();
    setSubmissionError(null);
  }, [activeTab, listenerForm, executorForm]);

  useEffect(() => {
    async function getSharerName() {
      if (!sharerId) return;

      console.log(`[ExecutorInviteModal] Fetching sharer name for ID: ${sharerId}`);
      setFetchError(null);
      setFetchedSharerName(null);

      try {
        const { data: sharerDetailsData, error } = await supabase
          .rpc('get_sharer_details_for_executor', { p_sharer_id: sharerId })
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (sharerDetailsData) {
          const typedSharerDetailsData = sharerDetailsData as SharerDetails;
          const name = `${typedSharerDetailsData.profile_first_name || ''} ${typedSharerDetailsData.profile_last_name || ''}`.trim();
          setFetchedSharerName(name || 'the Sharer');
          console.log(`[ExecutorInviteModal] Fetched sharer name: ${name}`);
        } else {
          console.warn(`[ExecutorInviteModal] No profile found for sharerId: ${sharerId}`);
          setFetchedSharerName('the Sharer');
          setFetchError(`Could not find Sharer profile.`);
        }
      } catch (error: any) {
        console.error('[ExecutorInviteModal] Error fetching sharer name:', error);
        setFetchError('Failed to load Sharer details.');
        setFetchedSharerName('the Sharer');
      }
    }

    if (open && sharerId) {
      getSharerName();
    }
  }, [open, sharerId, supabase]);

  const onSubmit = async (values: ListenerFormValues | ExecutorFormValues) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Authentication error. Please log in again.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    const role = activeTab.toUpperCase() as 'LISTENER' | 'EXECUTOR';
    const email = values.email;

    if (!role) {
        toast.error('Role not selected. Please select Listener or Executor.');
        setIsSubmitting(false);
        return;
    }

    try {
      const invitationData = {
        p_sharer_id: sharerId,
        p_invitee_email: email,
        p_role: role,
        ...(role === 'EXECUTOR' && {
          p_executor_first_name: (values as ExecutorFormValues).firstName,
          p_executor_last_name: (values as ExecutorFormValues).lastName,
          p_executor_relation: (values as ExecutorFormValues).relation,
          p_executor_phone: (values as ExecutorFormValues).phone,
        }),
      };

      console.log('Calling executor_create_invitation_safe with:', invitationData);

      const { data, error } = await supabase.rpc(
        'executor_create_invitation_safe', 
        invitationData
      );

      if (error) {
        console.error('Error response from executor_create_invitation_safe:', error);
        if (error.message.includes('An invitation already exists')) {
            setSubmissionError('An invitation already exists for this email and role for this sharer.');
        } else {
            throw new Error(error.message || 'Failed to send invitation.');
        }
      } else if (data && data.error) {
         console.error('Error payload from executor_create_invitation_safe:', data.error);
         setSubmissionError(data.error.message || data.error || 'An unexpected error occurred.');
      } else if (data) {
        console.log('Invitation created via RPC:', data);
        const invitationId = data.id;

        if (!invitationId) {
          throw new Error('RPC succeeded but did not return an invitation ID.');
        }

        try {
          console.log(`Attempting to send email for invitation ID: ${invitationId}`);
          const emailResponse = await fetch('/api/invitations/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invitationId: invitationId }), 
          });

          if (!emailResponse.ok) {
              const emailError = await emailResponse.json();
              console.error('Error sending invitation email:', emailError);
              toast.warning(`Invitation created, but failed to send email: ${emailError.message || 'Unknown error'}`);
          } else {
              console.log('Invitation email sent successfully.');
              toast.success(`Invitation sent successfully to ${email} as ${role}.`);
          }
        } catch (emailErr: any) {
            console.error('Error calling email sending API:', emailErr);
            toast.warning(`Invitation created, but failed to send email: ${emailErr.message || 'Network error'}`);
        }

        if (role === 'LISTENER') {
          listenerForm.reset();
        } else {
          executorForm.reset();
        }
        onOpenChange(false);
      } else {
         console.error('Unexpected null response from executor_create_invitation_safe');
         throw new Error('Received an unexpected response from the server.');
      }

    } catch (err: any) {
      console.error('Error sending invitation:', err);
      setSubmissionError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDialogTitle = () => {
    if (fetchError) return `Invite someone on behalf of the Sharer`;
    if (!fetchedSharerName) return `Loading Sharer details...`;
    return `Invite someone on behalf of ${fetchedSharerName}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 border-2 border-[#1B4332]">
        <div className="px-4 py-3 md:p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1 pr-8">
              <UserPlus className="h-5 w-5" />
              <DialogTitle className="text-2xl font-semibold">
                {getDialogTitle()}
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground hidden md:block">
              Send an invitation to someone to become a listener or executor
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 md:mt-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'listener' | 'executor')}>
              <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6">
                <TabsTrigger value="listener">Invite Listener</TabsTrigger>
                <TabsTrigger value="executor">Invite Executor</TabsTrigger>
              </TabsList>

              <TabsContent value="listener">
                <Form {...listenerForm}>
                  <form onSubmit={listenerForm.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
                    <FormField
                      control={listenerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter email address" 
                              type="email" 
                              className="text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-3 border-2 border-gray-200 focus-visible:ring-[#8fbc55]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-4 bg-[#1B4332] hover:bg-[#8fbc55] transition-colors" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Invitation'
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="executor">
                <Form {...executorForm}>
                  <form onSubmit={executorForm.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
                    {/* Group Email and Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 md:gap-4">
                      <FormField
                        control={executorForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter email address" 
                                type="email" 
                                className="text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-3 border-2 border-gray-200 focus-visible:ring-[#8fbc55]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={executorForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter phone number" 
                                type="tel" 
                                className="text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-3 border-2 border-gray-200 focus-visible:ring-[#8fbc55]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Group First Name and Last Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 md:gap-4">
                      <FormField
                        control={executorForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter first name" 
                                className="text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-3 border-2 border-gray-200 focus-visible:ring-[#8fbc55]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={executorForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter last name" 
                                className="text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-3 border-2 border-gray-200 focus-visible:ring-[#8fbc55]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={executorForm.control}
                      name="relation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relation to {fetchedSharerName || 'Sharer'}</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-3 border-2 border-gray-200 focus:ring-[#8fbc55]">
                                <SelectValue placeholder="Select relation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {personRelations.map((relation) => (
                                <SelectItem 
                                  key={relation} 
                                  value={relation}
                                  className="capitalize"
                                >
                                  {relation.replace(/([A-Z])/g, ' $1').trim()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-4 bg-[#1B4332] hover:bg-[#8fbc55] transition-colors mt-2 md:mt-0"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Invitation'
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 