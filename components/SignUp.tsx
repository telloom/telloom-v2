'use client';

import { useState, useCallback, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { signup } from '@/app/(auth)/signup/actions';

export default function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    rawPhone: '', // Add this line
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const [touchedFields, setTouchedFields] = useState({
    email: false,
    password: false,
    confirmPassword: false,
    phone: false,
  });

  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email) ? '' : 'Invalid email address';
  };

  const validatePassword = (password: string) => {
    return password.length >= 6 ? '' : 'Password must be at least 6 characters';
  };

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 ? '' : 'Phone number must be 10 digits';
  };

  const passwordsMatch = useMemo(() => {
    return formData.password === formData.confirmPassword || formData.confirmPassword === '';
  }, [formData.password, formData.confirmPassword]);

  const isFormValid = useMemo(() => {
    return (
      formData.email !== '' &&
      formData.password !== '' &&
      formData.confirmPassword !== '' &&
      formData.firstName !== '' &&
      formData.lastName !== '' &&
      formData.phone !== '' &&
      passwordsMatch &&
      Object.values(errors).every(error => error === '')
    );
  }, [formData, passwordsMatch, errors]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    if (!isFormValid) {
      setMessage({ type: 'error', text: 'Please correct the errors in the form' });
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('phone', formData.rawPhone); // Use the raw phone number

      const result = await signup(formDataToSend);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else if (result.success) {
        setMessage({ 
          type: 'success', 
          text: 'Sign-up successful! Please check your email to confirm your account.' 
        });
      }
    } catch (error: any) {
      console.error('Sign-up error:', error);
      setMessage({ type: 'error', text: error.message || 'An error occurred during sign up' });
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
    let error = '';

    if (name === 'phone') {
      const cleaned = value.replace(/\D/g, '');
      formattedValue = formatPhoneNumber(value);
      error = validatePhone(cleaned);
      setFormData(prev => ({ 
        ...prev, 
        [name]: formattedValue,
        rawPhone: cleaned // Store the unformatted version
      }));
    } else if (name === 'email') {
      error = validateEmail(value);
      setFormData(prev => ({ ...prev, [name]: value }));
    } else if (name === 'password') {
      error = validatePassword(value);
      setFormData(prev => ({ ...prev, [name]: value }));
    } else if (name === 'confirmPassword') {
      error = value !== formData.password ? 'Passwords do not match' : '';
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    setErrors(prev => ({ ...prev, [name]: error }));
  }, [formData.password]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  }, []);

  return (
    <Card className="w-[350px] relative">
      {message && message.type === 'success' && (
        <div className="absolute inset-0 bg-white bg-opacity-90 z-10 flex flex-col items-center justify-center p-6">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Success!</h2>
          <p className="text-center mb-4">{message.text}</p>
          <Button onClick={() => setMessage(null)}>Close</Button>
        </div>
      )}
      <CardHeader className="flex flex-col items-center">
        <Image
          src="/images/Telloom Logo V1-Horizontal Green.png"
          alt="Telloom Logo"
          width={200}
          height={50}
          className="mb-4"
        />
        <CardTitle>Sign up for Telloom</CardTitle>
        <CardDescription>Create your account to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                required
              />
              {touchedFields.email && errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleBlur}
                required
              />
              {touchedFields.password && errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onBlur={handleBlur}
                required
              />
              {touchedFields.confirmPassword && errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(123) 456-7890"
                value={formData.phone}
                onChange={handleInputChange}
                onBlur={handleBlur}
                required
              />
              {touchedFields.phone && errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
            </div>
          </div>
          <CardFooter className="flex flex-col items-center gap-4 pt-6">
            <Button className="w-full" type="submit" disabled={!isFormValid || loading}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </Button>
            <div className="flex w-full justify-center text-sm">
              <Link href="/login" className="text-primary hover:underline">
                Already have an account? Sign in
              </Link>
            </div>
            {message && message.type === 'error' && (
              <Alert
                className="mt-4"
                variant="destructive"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
