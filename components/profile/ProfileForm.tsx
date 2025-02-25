'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';

interface ProfileFormData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  addressStreet: string | null;
  addressUnit: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipcode: string | null;
}

interface ProfileFormProps {
  initialData: ProfileFormData;
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>(initialData);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Handle avatar upload if a new file was selected
      let newAvatarUrl = formData.avatarUrl;
      if (avatarFile) {
        // Remove old avatar if it exists
        if (formData.avatarUrl) {
          const oldAvatarPath = formData.avatarUrl.split('/').pop();
          if (oldAvatarPath) {
            await supabase.storage.from('public').remove([`avatars/${oldAvatarPath}`]);
          }
        }

        // Upload new avatar
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${formData.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('public')
          .upload(`avatars/${fileName}`, avatarFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        newAvatarUrl = `avatars/${fileName}`;
      }

      // Update profile in Supabase
      const { error } = await supabase
        .from('Profile')
        .update({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          addressStreet: formData.addressStreet,
          addressUnit: formData.addressUnit,
          addressCity: formData.addressCity,
          addressState: formData.addressState,
          addressZipcode: formData.addressZipcode,
          avatarUrl: newAvatarUrl,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', formData.id);

      if (error) {
        throw error;
      }

      toast.success('Profile updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName: string = '', lastName: string = '') => {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off" data-form-type="other">
      <div className="flex flex-col items-center space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium">Profile Photo</h3>
          <p className="text-sm text-muted-foreground">
            Click the circle below to {avatarPreview ? 'change' : 'add'} your profile photo
          </p>
        </div>
        <div 
          className="relative cursor-pointer group"
          onClick={handleAvatarClick}
          role="button"
          tabIndex={0}
          aria-label="Click to upload profile photo"
        >
          <Avatar className="h-24 w-24 border-2 border-muted">
            {avatarPreview ? (
              <AvatarImage
                src={avatarPreview.startsWith('blob:') ? avatarPreview : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${avatarPreview}`}
                alt="Profile"
              />
            ) : (
              <AvatarFallback className="bg-muted">
                {getInitials(formData.firstName || '', formData.lastName || '')}
              </AvatarFallback>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </Avatar>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload profile picture"
        />
        <p className="text-xs text-muted-foreground">
          Recommended: Square image, max 5MB
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName || ''}
            onChange={handleInputChange}
            placeholder="Enter your first name"
            required
            autoComplete="off"
            data-form-type="other"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName || ''}
            onChange={handleInputChange}
            placeholder="Enter your last name"
            required
            autoComplete="off"
            data-form-type="other"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email || ''}
          disabled
          className="bg-gray-50"
          autoComplete="off"
          data-form-type="other"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone || ''}
          onChange={handleInputChange}
          placeholder="(123) 456-7890"
          autoComplete="off"
          data-form-type="other"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Address</h3>
        <div className="space-y-2">
          <Label htmlFor="addressStreet">Street Address</Label>
          <Input
            id="addressStreet"
            name="addressStreet"
            value={formData.addressStreet || ''}
            onChange={handleInputChange}
            placeholder="Enter your street address"
            autoComplete="off"
            data-form-type="other"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="addressUnit">Unit/Apt</Label>
            <Input
              id="addressUnit"
              name="addressUnit"
              value={formData.addressUnit || ''}
              onChange={handleInputChange}
              placeholder="Unit/Apt number"
              autoComplete="off"
              data-form-type="other"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressCity">City</Label>
            <Input
              id="addressCity"
              name="addressCity"
              value={formData.addressCity || ''}
              onChange={handleInputChange}
              placeholder="Enter your city"
              autoComplete="off"
              data-form-type="other"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="addressState">State</Label>
            <Input
              id="addressState"
              name="addressState"
              value={formData.addressState || ''}
              onChange={handleInputChange}
              placeholder="Enter your state"
              autoComplete="off"
              data-form-type="other"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressZipcode">ZIP Code</Label>
            <Input
              id="addressZipcode"
              name="addressZipcode"
              value={formData.addressZipcode || ''}
              onChange={handleInputChange}
              placeholder="Enter your ZIP code"
              autoComplete="off"
              data-form-type="other"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-[#1B4332] hover:bg-[#8fbc55] text-white transition-colors rounded-full"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
} 