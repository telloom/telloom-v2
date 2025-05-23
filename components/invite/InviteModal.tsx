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
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@radix-ui/react-icons";
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";

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

const executorSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  relation: z.enum(personRelations, {
    required_error: 'Please select a relation',
  }),
  phone: z.string().min(1, 'Phone number is required'),
});

const listenerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-[#8fbc55] hover:text-[#1B4332] focus:bg-[#8fbc55] focus:text-[#1B4332] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <CheckIcon className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

export default function InviteModal({ open, onOpenChange }: InviteModalProps) {
  const [activeTab, setActiveTab] = useState<'LISTENER' | 'EXECUTOR'>('LISTENER');
  const { sendInvitation, isLoading } = useInvitationStore();

  const executorForm = useForm({
    resolver: zodResolver(executorSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      relation: undefined,
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 border-2 border-[#1B4332]">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Send Invitation</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Invite someone to join as a listener or executor
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'LISTENER' | 'EXECUTOR')}>
              <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6">
                <TabsTrigger value="LISTENER">Invite Listener</TabsTrigger>
                <TabsTrigger value="EXECUTOR">Invite Executor</TabsTrigger>
              </TabsList>

              <TabsContent value="LISTENER">
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
                              placeholder="email@example.com" 
                              {...field} 
                              className="text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-3"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-4 bg-[#1B4332] hover:bg-[#8fbc55] text-white transition-all duration-300"
                      disabled={isLoading}
                    >
                      {isLoading ? (
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
                  <form onSubmit={executorForm.handleSubmit(onSubmit)} className="space-y-2 md:space-y-4">
                    <FormField
                      control={executorForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="email@example.com" 
                              {...field} 
                              className="text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-3"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 md:gap-y-4">
                      <FormField
                        control={executorForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} className="text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-3" />
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
                              <Input {...field} className="text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-3" />
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
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-3">
                                <SelectValue placeholder="Select a relation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {personRelations.map((relation) => (
                                <SelectItem key={relation} value={relation}>
                                  {relation}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            <Input {...field} className="text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-3" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full text-[16px] h-8 px-3 rounded-full md:text-sm md:h-9 md:px-4 bg-[#1B4332] hover:bg-[#8fbc55] text-white transition-all duration-300"
                      disabled={isLoading}
                    >
                      {isLoading ? (
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