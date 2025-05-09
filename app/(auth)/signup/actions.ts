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
    redirect('/(auth)/error');
  }
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(formData: FormData) {
  console.log('Starting direct signup process in server action...');

  try {
    // Extract and validate form data
    const rawData = {
      email: formData.get('email'),
      password: formData.get('password'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone')
    };

    const validationResult = signupSchema.safeParse(rawData);
    if (!validationResult.success) {
      console.error('Validation error in server action:', validationResult.error.errors);
      return {
        error: 'Invalid form data',
        details: validationResult.error.errors,
        code: 'VALIDATION_ERROR',
        success: false,
      };
    }

    const { email, password, firstName, lastName, phone } = validationResult.data;

    const supabase = await createClient();

    // Construct the email redirect URL using NEXT_PUBLIC_APP_URL
    const emailRedirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/confirm?next=/select-role`;
    console.log('Email redirect URL for signup:', emailRedirectTo);


    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName,
          lastName,
          phone,
          fullName: `${firstName} ${lastName}`,
        },
        emailRedirectTo,
      },
    });

    if (signUpError) {
      console.error('Supabase signup error in server action:', signUpError);
      return {
        error: signUpError.message,
        details: signUpError.code ? [{ path: ['general'], message: signUpError.message, code: signUpError.code }] : undefined,
        code: signUpError.code || 'SUPABASE_SIGNUP_ERROR',
        success: false,
      };
    }

    if (!user) {
      console.error('Supabase signup in server action: No user returned, but no error reported.');
      return {
        error: 'Failed to create user account (no user object returned).',
        code: 'NO_USER_RETURNED',
        success: false,
      };
    }
    
    console.log('User signed up successfully in server action:', user.id);
    // The SignUp.tsx component expects a success field and a message
    // It handles client-side redirect to /check-email
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName,
        lastName,
      },
      message: 'Sign-up successful! Please check your email to confirm your account.'
    };

  } catch (error: any) {
    console.error('Unexpected error during signup in server action:', error);
    return {
      error: 'An unexpected error occurred during signup.',
      details: error.message,
      code: 'UNEXPECTED_SERVER_ACTION_ERROR',
      success: false,
    };
  }
}