'use server'

import { createClient } from '../../../utils/supabase/server'

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = createClient()

  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    throw new Error(error.message)
  }
}