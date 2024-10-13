'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import Link from 'next/link'
import Image from 'next/image'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function SignForgotPassword() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send reset password email');
      }

      setMessage({ type: 'success', text: 'Password reset email sent. Please check your inbox.' })
    } catch (error) {
      console.error('Forgot password error:', error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to send reset email. Please try again.' })
    } finally {
      setLoading(false)
    }
  };

  return (
    <Card className="w-[350px]">
      <CardHeader className="flex flex-col items-center">
        <Image
          src="/images/Telloom Logo V1-Horizontal Green.png"
          alt="Telloom Logo"
          width={200}
          height={50}
          className="mb-4"
        />
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>Enter your email to reset your password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register('email')}
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
          </div>
          <CardFooter className="flex flex-col items-center gap-4 px-0 pt-6">
            <Button 
              className="w-full" 
              type="submit"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Sending...' : 'Reset Password'}
            </Button>
            <div className="flex w-full justify-between text-sm">
              <Link href="/login" className="text-primary hover:underline">
                Back to Login
              </Link>
              <Link href="/signup" className="text-primary hover:underline">
                Sign Up
              </Link>
            </div>
            {message && (
              <Alert className="mt-4" variant={message.type === 'error' ? "destructive" : "default"}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{message.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  )
}
