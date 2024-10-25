// app/(auth)/login/actions.ts
// This file contains server actions for user authentication

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
  const { error } = await supabase.auth.signInWithPassword(data)
  if (error) {
    return redirect('/login?error=Invalid email or password')
  }
  revalidatePath('/', 'layout')
  // Dispatch a custom event to notify the Header component
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-state-changed'));
  }
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
  const { error } = await supabase.auth.signUp(data)
  if (error) {
    return redirect('/signup?error=Sign up failed')
  }
  revalidatePath('/', 'layout')
  redirect('/')
}
