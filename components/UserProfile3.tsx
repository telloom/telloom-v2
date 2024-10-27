// components/UserProfile.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from '@/utils/supabase/client'

const profileSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  addressStreet: z.string().nullable().optional(),
  addressUnit: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressState: z.string().nullable().optional(),
  addressZipcode: z.string().nullable().optional(),
  executorFirstName: z.string().nullable().optional(),
  executorLastName: z.string().nullable().optional(),
  executorRelation: z.string().nullable().optional(),
  executorPhone: z.string().nullable().optional(),
  executorEmail: z.union([
    z.string().email("Invalid email address").optional(),
    z.literal('')
  ]),
  updatedAt: z.string().nullable().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface UserProfileProps {
  initialData: ProfileFormValues
}

export default function UserProfile({ initialData }: UserProfileProps) {
  const [loading, setLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      ...initialData,
      // Replace null values with empty strings for optional fields
      addressStreet: initialData.addressStreet ?? '',
      addressUnit: initialData.addressUnit ?? '',
      addressCity: initialData.addressCity ?? '',
      addressState: initialData.addressState ?? '',
      addressZipcode: initialData.addressZipcode ?? '',
      executorFirstName: initialData.executorFirstName ?? '',
      executorLastName: initialData.executorLastName ?? '',
      executorRelation: initialData.executorRelation ?? '',
      executorPhone: initialData.executorPhone ?? '',
      executorEmail: initialData.executorEmail ?? '',
      updatedAt: initialData.updatedAt ?? '',
    },
  })

  useEffect(() => {
    const subscription = form.watch(() => setIsDirty(true))
    return () => subscription.unsubscribe()
  }, [form])

  async function onSubmit(data: ProfileFormValues) {
    try {
      setLoading(true)
      console.log('Submitting data:', data)

      const { data: upsertData, error } = await supabase
        .from('Profile')
        .upsert({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Upsert response:', upsertData)

      if (!upsertData || upsertData.length === 0) {
        throw new Error('No data returned from upsert operation')
      }

      // Update the form with the returned data
      form.reset(upsertData[0])
      setIsDirty(false)
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: "There was a problem updating your profile.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* First Name */}
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={loading} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Last Name */}
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={loading} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Email (read-only) */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={true} readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={loading} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Address */}
            <div className="space-y-2">
              <FormLabel>Address</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                {/* Street */}
                <FormField
                  control={form.control}
                  name="addressStreet"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="Street" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Unit */}
                <FormField
                  control={form.control}
                  name="addressUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="Unit" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* City */}
                <FormField
                  control={form.control}
                  name="addressCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="City" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* State */}
                <FormField
                  control={form.control}
                  name="addressState"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="State" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Zipcode */}
                <FormField
                  control={form.control}
                  name="addressZipcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="Zipcode" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            {/* Executor Information */}
            <div className="space-y-2">
              <FormLabel>Executor Information</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                {/* Executor First Name */}
                <FormField
                  control={form.control}
                  name="executorFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="First Name" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Executor Last Name */}
                <FormField
                  control={form.control}
                  name="executorLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="Last Name" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Executor Relation */}
                <FormField
                  control={form.control}
                  name="executorRelation"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="Relation" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Executor Phone */}
                <FormField
                  control={form.control}
                  name="executorPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="Phone" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Executor Email */}
                <FormField
                  control={form.control}
                  name="executorEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="Email" disabled={loading} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            {/* Save Button */}
            <Button type="submit" disabled={loading || !isDirty}>
              {loading ? 'Loading...' : isDirty ? 'Save Changes' : 'Saved'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Last updated: {form.getValues('updatedAt') ? new Date(form.getValues('updatedAt') ?? '').toLocaleDateString() : 'Never'}
        </p>
      </CardFooter>
    </Card>
  )
}
