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
    redirect('/error')
  }
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = createClient()
  
  // Log the received form data
  console.log('Received form data:', Object.fromEntries(formData));

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const phone = formData.get('phone') as string // This should now be the raw 10-digit number

  if (typeof email !== 'string' || typeof password !== 'string') {
    console.error('Invalid email or password');
    return { error: 'Invalid email or password' }
  }

  const data = {
    email,
    password,
    options: {
      data: {
        firstName,
        lastName,
        phone,
      }
    }
  }

  // Log the data object
  console.log('Data object:', data);

  try {
    const { error } = await supabase.auth.signUp(data)
    if (error) {
      if (error.status === 429 && error.message.includes('email rate limit exceeded')) {
        console.error('Email rate limit exceeded');
        return { error: 'Too many sign-up attempts. Please try again later.' };
      }
      console.error('Supabase signup error:', error);
      return { error: 'An error occurred during sign up. Please try again.' };
    }
    return { success: true };
  } catch (error) {
    console.error('Unexpected error during signup:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}
