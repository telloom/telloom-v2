// app/api/auth/signup/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits')
})

export async function POST(request: Request) {
  try {
    const formData = await request.json()
    const validationResult = signupSchema.safeParse(formData)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          fullName: `${formData.firstName} ${formData.lastName}`
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/confirm?next=/select-role`
      }
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: formData.firstName,
        lastName: formData.lastName
      },
      message: 'Check your email to confirm your account'
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}