/**
 * File: components/auth/SignUp.tsx
 * Description: Sign up form component that handles user registration using Supabase Auth.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientFormWrapper } from '@/components/client-wrapper';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { signup } from '@/app/(auth)/signup/actions';
import { z } from 'zod';
import { useRouter } from 'next/navigation';  // <-- Added import for router

// Base validation schemas for individual fields
const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Must be at least 2 characters');
const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits');

// Combined validation schema for signup form
const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignUp() {
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof SignupFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof SignupFormData, boolean>>>({});
  const router = useRouter();  // <-- Initialize router

  const validateField = useCallback((name: keyof SignupFormData, value: string) => {
    try {
      if (name === 'confirmPassword') {
        if (value !== formData.password) {
          return "Passwords don't match";
        }
        return '';
      }
      
      // Use the appropriate schema for each field
      const fieldSchema = {
        email: emailSchema,
        password: passwordSchema,
        firstName: nameSchema,
        lastName: nameSchema,
        phone: phoneSchema
      }[name];

      if (fieldSchema) {
        fieldSchema.parse(value);
        return '';
      }
      
      return 'Invalid value';
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message || 'Invalid value';
      }
      return 'Invalid value';
    }
  }, [formData.password]);

  const isFormValid = useMemo(() => {
    try {
      signupSchema.parse(formData);
      return true;
    } catch {
      return false;
    }
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      signupSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: typeof errors = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof SignupFormData] = err.message;
          }
        });
        setErrors(newErrors);
        toast.error('Please correct the errors in the form');
        return;
      }
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('phone', formData.phone.replace(/\D/g, ''));

      const result = await signup(formDataToSend);
      
      if (result.error) {
        if (result.details) {
          // Handle validation errors from the server
          if (Array.isArray(result.details)) {
            const newErrors: typeof errors = {};
            result.details.forEach((error: any) => {
              if (error.path?.[0]) {
                newErrors[error.path[0] as keyof SignupFormData] = error.message;
              }
            });
            setErrors(newErrors);
          }
          toast.error(result.error);
        } else {
          toast.error(result.error);
        }
      } else if (result.success) {
        toast.success(result.message || 'Sign-up successful! Please check your email to confirm your account.');
        // Redirect to the check-email page upon successful signup
        router.push('/check-email');
      }
    } catch (error: any) {
      console.error('Sign-up error:', error);
      toast.error(error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (input: string) => {
    const cleaned = input.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return input;
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    if (name === 'phone') {
      formattedValue = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    
    if (touchedFields[name as keyof SignupFormData]) {
      const error = validateField(name as keyof SignupFormData, formattedValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touchedFields, validateField]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const error = validateField(name as keyof SignupFormData, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Image
            src="/images/Telloom Logo V1-Horizontal Green.png"
            alt="Telloom Logo"
            width={160}
            height={40}
            className="mx-auto mb-3"
          />
          <h1 className="text-xl font-bold tracking-tight">Create your account</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sign up to get started with Telloom
          </p>
        </div>

        <div className="bg-card border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] p-5 rounded-lg">
          <ClientFormWrapper>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium leading-none">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  required
                  className="h-9 border-input rounded-full"
                  disabled={loading}
                  aria-label="Email address"
                />
                {touchedFields.email && errors.email && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium leading-none">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  required
                  className="h-9 border-input rounded-full"
                  disabled={loading}
                  aria-label="Password"
                />
                {touchedFields.password && errors.password && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.password}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  required
                  className="h-9 border-input rounded-full"
                  disabled={loading}
                  aria-label="Confirm password"
                />
                {touchedFields.confirmPassword && errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="firstName" className="text-sm font-medium leading-none">
                    First Name
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    required
                    className="h-9 border-input rounded-full"
                    disabled={loading}
                    aria-label="First name"
                  />
                  {touchedFields.firstName && errors.firstName && (
                    <p className="text-xs text-red-500 mt-0.5">{errors.firstName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lastName" className="text-sm font-medium leading-none">
                    Last Name
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    required
                    className="h-9 border-input rounded-full"
                    disabled={loading}
                    aria-label="Last name"
                  />
                  {touchedFields.lastName && errors.lastName && (
                    <p className="text-xs text-red-500 mt-0.5">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-sm font-medium leading-none">
                  Phone
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(123) 456-7890"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  required
                  className="h-9 border-input rounded-full"
                  disabled={loading}
                  aria-label="Phone number"
                />
                {touchedFields.phone && errors.phone && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-9 bg-[#1B4332] hover:bg-[#8fbc55] text-white transition-colors rounded-full"
                  disabled={!isFormValid || loading}
                  aria-label={loading ? 'Signing up...' : 'Sign Up'}
                >
                  {loading ? 'Signing up...' : 'Sign Up'}
                </Button>

                <div className="text-center text-sm mt-3">
                  <p className="text-muted-foreground text-xs">
                    Already have an account?{' '}
                    <Link href="/login" className="text-[#1B4332] hover:text-[#8fbc55] transition-colors font-medium">
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </ClientFormWrapper>
        </div>
      </div>
    </div>
  );
}