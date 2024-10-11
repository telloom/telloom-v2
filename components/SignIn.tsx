'use client'

import { useState } from 'react'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

export default function EmailSignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Successfully signed in!' })
      router.refresh()
    } catch (error) {
      console.error('Sign-in error:', error)
      setMessage({ type: 'error', text: 'Failed to sign in. Please check your credentials and try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Sign in to Telloom</CardTitle>
        <CardDescription>Enter your email and password to sign in</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignIn}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-4">
        <Button 
          className="w-full" 
          onClick={handleSignIn}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
        <div className="flex w-full justify-between text-sm">
          <Link href="/auth/forgot-password" className="text-primary hover:underline">
            Forgot Password?
          </Link>
          <Link href="/auth/register" className="text-primary hover:underline">
            Register
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