/**
 * File: components/executor/connections/ExecutorInviteModal.tsx
 * Description: Modal component for executors to send invitations on behalf of a sharer
 */

'use client';

import { useState } from 'react';
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
import { Loader2, UserPlus } from 'lucide-react';
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
  sharerName: string;
}

export default function ExecutorInviteModal({ 
  open, 
  onOpenChange, 
  sharerId,
  sharerName 
}: ExecutorInviteModalProps) {
  const [activeTab, setActiveTab] = useState<'LISTENER' | 'EXECUTOR'>('LISTENER');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onSubmit = async (values: ListenerFormValues | ExecutorFormValues) => {
    try {
      setIsSubmitting(true);
      const supabase = createClient();

      // Get current user (executor) details
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: executor, error: executorError } = await supabase
        .from('Profile')
        .select('firstName, lastName')
        .eq('id', user.id)
        .single();

      if (executorError || !executor) {
        console.error('Error fetching executor:', executorError);
        throw new Error('Failed to fetch executor details');
      }

      // Generate invitation token
      const token = crypto.randomUUID();

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('Invitation')
        .insert([{
          token,
          sharerId,
          inviterId: user.id,
          inviteeEmail: values.email,
          role: activeTab,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(activeTab === 'EXECUTOR' && {
            executorFirstName: (values as ExecutorFormValues).firstName,
            executorLastName: (values as ExecutorFormValues).lastName,
            executorRelation: (values as ExecutorFormValues).relation,
            executorPhone: (values as ExecutorFormValues).phone,
          }),
        }])
        .select()
        .single();

      if (inviteError) {
        console.error('Error creating invitation:', inviteError);
        throw new Error('Failed to create invitation');
      }

      // Send invitation email using the same endpoint as sharers
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
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invitation');
      }

      toast.success('Invitation sent successfully');
      
      // Reset the appropriate form
      if (activeTab === 'LISTENER') {
        listenerForm.reset();
      } else {
        executorForm.reset();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 border-2 border-[#1B4332]">
        <div className="p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="h-5 w-5" />
              <DialogTitle className="text-2xl font-semibold">
                Invite on behalf of {sharerName}
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              Send an invitation to someone to become a listener or executor
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'LISTENER' | 'EXECUTOR')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="LISTENER">Invite Listener</TabsTrigger>
                <TabsTrigger value="EXECUTOR">Invite Executor</TabsTrigger>
              </TabsList>

              <TabsContent value="LISTENER">
                <Form {...listenerForm}>
                  <form onSubmit={listenerForm.handleSubmit(onSubmit)} className="space-y-4">
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
                              className="border-2 border-gray-200 rounded-lg focus-visible:ring-[#8fbc55]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full rounded-full bg-[#1B4332] hover:bg-[#8fbc55] transition-colors" 
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

              <TabsContent value="EXECUTOR">
                <Form {...executorForm}>
                  <form onSubmit={executorForm.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                className="border-2 border-gray-200 rounded-lg focus-visible:ring-[#8fbc55]"
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
                                className="border-2 border-gray-200 rounded-lg focus-visible:ring-[#8fbc55]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={executorForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter first name" 
                                className="border-2 border-gray-200 rounded-lg focus-visible:ring-[#8fbc55]"
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
                                className="border-2 border-gray-200 rounded-lg focus-visible:ring-[#8fbc55]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={executorForm.control}
                        name="relation"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Relation to {sharerName}</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="border-2 border-gray-200 rounded-lg focus:ring-[#8fbc55]">
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
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full rounded-full bg-[#1B4332] hover:bg-[#8fbc55] transition-colors" 
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