// app/(auth)/signup/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

// Validation schema for signup request
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits')
});

export type SignupFormData = z.infer<typeof signupSchema>;

export async function login(formData: FormData) {
  const supabase = await createClient();
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };
  const { error } = await supabase.auth.signInWithPassword(data);
  if (error) {
    redirect('/error');
  }
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(formData: FormData) {
  console.log('Starting signup process...');
  
  try {
    // Extract and validate form data
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone')
    };

    const result = signupSchema.safeParse(data);
    if (!result.success) {
      console.error('Validation error:', result.error.errors);
      return { 
        error: 'Invalid form data',
        details: result.error.errors,
        code: 'VALIDATION_ERROR'
      };
    }

    const validatedData = result.data;

    // Construct absolute URL using the base URL from environment variables.
    const apiUrl = new URL('/api/auth/signup', process.env.NEXT_PUBLIC_APP_URL!).toString();

    // Make API call to signup endpoint using the absolute URL
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Signup error:', responseData);
      return { 
        error: responseData.error || 'Failed to sign up',
        details: responseData.details,
        code: responseData.code || 'UNKNOWN_ERROR'
      };
    }

    return { 
      success: true,
      user: responseData.user,
      message: responseData.message
    };
  } catch (error: any) {
    console.error('Unexpected error during signup:', error);
    return { 
      error: 'An unexpected error occurred',
      details: error.message,
      code: 'UNEXPECTED_ERROR'
    };
  }
}