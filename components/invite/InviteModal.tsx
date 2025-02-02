/**
 * File: components/invite/InviteModal.tsx
 * Description: Modal component for sending invitations to new listeners or executors
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
import { useInvitationStore } from '@/stores/invitationStore';
import InvitationsList from './InvitationsList';
import ActiveConnections from './ActiveConnections';
import { Separator } from '@/components/ui/separator';

const executorSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  relation: z.string().min(1, 'Relation is required'),
  phone: z.string().min(1, 'Phone number is required'),
});

const listenerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InviteModal({ open, onOpenChange }: InviteModalProps) {
  const [activeTab, setActiveTab] = useState<'LISTENER' | 'EXECUTOR'>('LISTENER');
  const { sendInvitation, isLoading } = useInvitationStore();

  const executorForm = useForm({
    resolver: zodResolver(executorSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      relation: '',
      phone: '',
    },
  });

  const listenerForm = useForm({
    resolver: zodResolver(listenerSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await sendInvitation({
        ...data,
        role: activeTab,
      });
      toast.success(`Invitation sent to ${data.email}`);
      if (activeTab === 'EXECUTOR') {
        executorForm.reset();
      } else {
        listenerForm.reset();
      }
    } catch (error) {
      toast.error('Failed to send invitation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Connections</DialogTitle>
          <DialogDescription>
            Send invitations and manage your listeners and executors
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Send New Invitation</h3>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'LISTENER' | 'EXECUTOR')}>
              <TabsList className="grid w-full grid-cols-2">
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
                            <Input placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-[#1B4332] hover:bg-[#8fbc55] text-white"
                      disabled={isLoading}
                    >
                      Send Invitation
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="EXECUTOR">
                <Form {...executorForm}>
                  <form onSubmit={executorForm.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={executorForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={executorForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
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
                              <Input {...field} />
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
                          <FormLabel>Relation</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-[#1B4332] hover:bg-[#8fbc55] text-white"
                      disabled={isLoading}
                    >
                      Send Invitation
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          <div className="space-y-6">
            <InvitationsList />
            <Separator />
            <ActiveConnections />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 