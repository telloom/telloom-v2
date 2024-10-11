// app/(auth)/reset-password/[token]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const access_token = searchParams.get('access_token');
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (!access_token) {
      setError('Invalid or missing access token.');
    }
  }, [access_token]);

  const onSubmit = async (data: any) => {
    if (!access_token) {
      return;
    }

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password: data.password, access_token }),
    });

    if (res.ok) {
      router.push('/auth/login');
    } else {
      const errorData = await res.json();
      setError(errorData.error);
    }
  };

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>New Password:</label>
        <Input type="password" {...register('password')} />
        {errors.password && <p>{errors.password.message as string}</p>}
      </div>
      <div>
        <label>Confirm Password:</label>
        <Input type="password" {...register('confirmPassword')} />
        {errors.confirmPassword && <p>{errors.confirmPassword.message as string}</p>}
      </div>
      <Button type="submit">Reset Password</Button>
    </form>
  );
}