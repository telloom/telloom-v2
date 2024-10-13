// app/api/auth/signup/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const formData = await request.json()
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      emailRedirectTo: `${requestUrl.origin}/auth/callback`,
      data: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
      },
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ user: data.user, message: 'Check your email for the confirmation link!' })
}
