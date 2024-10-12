'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

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

      if (res.ok) {
        setMessage({ type: 'success', text: 'Password reset email sent. Please check your inbox.' })
        // Optionally, redirect to a confirmation page
        // router.push('/auth/check-email');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'An error occurred');
      }
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
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-4">
        <Button 
          className="w-full" 
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? 'Sending...' : 'Reset Password'}
        </Button>
        <div className="flex w-full justify-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Back to Sign In
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
    </Card>
  )
}

