'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useUserStore } from '@/stores/userStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Camera, Search } from 'lucide-react';
import { cn } from "@/lib/utils";
import { normalizeAvatarUrl, getSignedAvatarUrl, getBaseAvatarUrl } from '@/utils/avatar';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { USState } from '@/utils/states';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface ProfileFormData {
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
  states: USState[];
}

function StateDropdown({ 
  states, 
  selectedState, 
  onStateChange 
}: { 
  states: USState[]; 
  selectedState: string | null; 
  onStateChange: (state: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredStates = states.filter((state) =>
    state.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    state.abbreviation.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const selectedStateName = selectedState 
    ? states.find((state) => state.abbreviation === selectedState)?.fullname 
    : "Select state...";
  
  return (
    <div className="w-full">
      {/* Desktop/Tablet View */}
      <div className="hidden md:block w-full">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between rounded-full"
            >
              {selectedStateName}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-2 rounded-md border shadow-md max-h-[300px] overflow-y-auto">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search states..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-md pl-8"
                />
              </div>
              
              {filteredStates.length === 0 ? (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  No state found
                </div>
              ) : (
                <div className="max-h-[200px] overflow-y-auto rounded-md border">
                  {filteredStates.map((state) => (
                    <div
                      key={state.abbreviation}
                      className={cn(
                        "flex items-center px-4 py-2 text-sm",
                        "cursor-pointer",
                        "hover:bg-[#8fbc55] hover:text-white",
                        selectedState === state.abbreviation 
                          ? "bg-[#1B4332] text-white" 
                          : "bg-transparent",
                        "transition-colors"
                      )}
                      onClick={() => {
                        onStateChange(state.abbreviation);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selectedState === state.abbreviation ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{state.fullname}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Mobile View */}
      <div className="md:hidden w-full">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between rounded-full"
            >
              {selectedStateName}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0 rounded-t-xl max-h-[85vh]">
            <div className="flex flex-col h-full">
              <div className="w-full flex justify-center pt-3 pb-1">
                <div className="h-1.5 w-16 rounded-full bg-gray-300"></div>
              </div>
              <SheetHeader className="px-4 py-2 border-b">
                <SheetTitle className="text-lg font-semibold text-[#1B4332]">Select State</SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-3 flex-1 overflow-hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search states..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-md pl-9"
                  />
                </div>
                
                <div className="flex-1 overflow-hidden">
                  {filteredStates.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No state found
                    </div>
                  ) : (
                    <div className="max-h-[50vh] overflow-y-auto rounded-md border">
                      {filteredStates.map((state) => (
                        <div
                          key={state.abbreviation}
                          className={cn(
                            "flex items-center px-4 py-3 text-base",
                            "cursor-pointer",
                            "hover:bg-[#8fbc55] hover:text-white",
                            selectedState === state.abbreviation 
                              ? "bg-[#1B4332] text-white" 
                              : "bg-transparent",
                            "transition-colors"
                          )}
                          onClick={() => {
                            onStateChange(state.abbreviation);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              selectedState === state.abbreviation ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{state.fullname}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default function ProfileForm({ initialData, states }: ProfileFormProps) {
  const router = useRouter();
  const { setProfile } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>(initialData);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData.avatarUrl);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropImage, setCropImage] = useState<string>('');
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0
  });
  const imageRef = useRef<HTMLImageElement>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [signedAvatarUrl, setSignedAvatarUrl] = useState<string | null>(null);
  const supabase = createClient();

  const formatPhoneNumber = (input: string) => {
    const cleaned = input.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return input;
  };

  const formatZipCode = (input: string) => {
    // Remove any non-digit characters
    const cleaned = input.replace(/\D/g, '');
    // Limit to 5 digits
    return cleaned.slice(0, 5);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    if (name === 'phone') {
      formattedValue = formatPhoneNumber(value);
    } else if (name === 'addressZipcode') {
      formattedValue = formatZipCode(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name as keyof ProfileFormData]: formattedValue
    }));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Create a preview URL and show crop dialog
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleDirectUpload = async (file: File) => {
    try {
      setIsLoading(true);

      // Delete old avatar if it exists
      if (formData.avatarUrl) {
        const baseUrl = getBaseAvatarUrl(formData.avatarUrl);
        if (baseUrl) {
          const oldPath = baseUrl.split('avatars/')[1];
          if (oldPath) {
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.id}/${uuidv4()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update form data with normalized URL first
      const normalizedUrl = normalizeAvatarUrl(publicUrl);
      
      // Try to get a signed URL immediately
      let signedUrl = null;
      try {
        signedUrl = await getSignedAvatarUrl(normalizedUrl);
      } catch (signedUrlError) {
        console.error('Error getting initial signed URL:', signedUrlError);
        // We'll continue with the normalized URL
      }

      // Update all the state
      setFormData(prev => ({ ...prev, avatarUrl: normalizedUrl }));
      setAvatarPreview(normalizedUrl);
      if (signedUrl) {
        setSignedAvatarUrl(signedUrl);
      }
      setAvatarLoadError(false);

      return normalizedUrl;

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getCroppedImg = (image: HTMLImageElement, crop: Crop): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width!;
    canvas.height = crop.height!;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(
      image,
      crop.x! * scaleX,
      crop.y! * scaleY,
      crop.width! * scaleX,
      crop.height! * scaleY,
      0,
      0,
      crop.width!,
      crop.height!
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Canvas is empty');
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCropComplete = async () => {
    if (!imageRef.current || !crop.width || !crop.height) return;

    try {
      setIsLoading(true);
      const croppedBlob = await getCroppedImg(imageRef.current, crop);
      const croppedFile = new File([croppedBlob], 'cropped-avatar.jpg', { type: 'image/jpeg' });
      
      // Handle the direct upload first
      const newAvatarUrl = await handleDirectUpload(croppedFile);
      if (!newAvatarUrl) {
        throw new Error('Failed to upload avatar');
      }

      // After successful upload, update the profile with all current form data
      const success = await updateProfileData({
        ...formData,
        avatarUrl: newAvatarUrl
      });

      if (success) {
        setShowCropDialog(false);
      }

    } catch (error) {
      console.error('Error in handleCropComplete:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate ZIP code if provided
    if (formData.addressZipcode && !/^\d{5}$/.test(formData.addressZipcode)) {
      toast.error('ZIP code must be 5 digits');
      return;
    }
    
    await updateProfileData(formData);
  };

  const updateProfileData = async (updatedData: Partial<ProfileFormData>): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Construct the payload with only actual Profile table columns
      // This payload will be sent to the RPC function
      const payloadForUpdate: Partial<ProfileFormData> = {
        firstName: updatedData.firstName,
        lastName: updatedData.lastName,
        phone: updatedData.phone,
        avatarUrl: updatedData.avatarUrl,
        addressStreet: updatedData.addressStreet,
        addressUnit: updatedData.addressUnit,
        addressCity: updatedData.addressCity,
        addressState: updatedData.addressState,
        addressZipcode: updatedData.addressZipcode,
      };

      // Call the secure RPC function to update the profile
      const { data: updateResultJson, error: rpcError } = await supabase
        .rpc('update_profile_safe', {
          target_user_id: formData.id, // Pass the ID of the profile to update
          update_payload: payloadForUpdate // Pass the filtered data
        });

      if (rpcError) {
        throw rpcError; // Throw if the RPC call itself failed
      }

      // The RPC function returns the updated profile as JSONB
      const updateResult: ProfileFormData | null = updateResultJson as ProfileFormData | null;

      // Update both local form state and global profile state
      if (updateResult && updateResult.id) {
        // Normalize the avatar URL if it exists
        if (updateResult.avatarUrl) {
          updateResult.avatarUrl = normalizeAvatarUrl(updateResult.avatarUrl);
        }

        // Update local state with the result from the RPC call
        setFormData({
          id: updateResult.id,
          email: formData.email, // Email wasn't updated, keep the original
          firstName: updateResult.firstName,
          lastName: updateResult.lastName,
          phone: updateResult.phone,
          avatarUrl: updateResult.avatarUrl,
          addressStreet: updateResult.addressStreet,
          addressUnit: updateResult.addressUnit,
          addressCity: updateResult.addressCity,
          addressState: updateResult.addressState,
          addressZipcode: updateResult.addressZipcode,
        });

        // Update global store with full profile data to trigger header refresh
        setProfile({
          ...updateResult,
          userId: updateResult.id, // Ensure userId is set if needed by Profile type
          createdAt: null,
          updatedAt: null,
        });
        setAvatarPreview(updateResult.avatarUrl);
      } else {
        // Handle cases where RPC might not return data as expected
        console.error('RPC update_profile_safe did not return valid profile data:', updateResultJson);
        throw new Error('Profile update via RPC failed to return data.');
      }

      toast.success('Profile updated successfully');
      router.refresh();
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Add effect to handle signed URLs
  useEffect(() => {
    const getSignedUrl = async () => {
      if (avatarPreview) {
        try {
          const signedUrl = await getSignedAvatarUrl(avatarPreview);
          if (signedUrl) {
            setSignedAvatarUrl(signedUrl);
            setAvatarLoadError(false);
          }
        } catch (error) {
          console.error('Error getting signed avatar URL:', error);
          // If we can't get a signed URL, try using the public URL directly
          setSignedAvatarUrl(avatarPreview);
        }
      }
    };
    getSignedUrl();
  }, [avatarPreview]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Avatar className="h-24 w-24">
            {avatarPreview && !avatarLoadError ? (
              <AvatarImage
                src={signedAvatarUrl || avatarPreview}
                alt="Profile"
                className="object-cover"
                onLoad={() => {
                  setAvatarLoadError(false);
                }}
                onError={() => {
                  setAvatarLoadError(true);
                }}
              />
            ) : (
              <AvatarFallback>
                {getInitials(formData.firstName || '', formData.lastName || '')}
              </AvatarFallback>
            )}
          </Avatar>
          <Input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
            id="avatar-upload"
          />
          <Label
            htmlFor="avatar-upload"
            className="absolute bottom-0 right-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
          >
            <Camera className="h-4 w-4" />
            <span className="sr-only">Change avatar</span>
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Recommended: Square image, max 5MB
        </p>
      </div>

      {/* Image Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-[90vw] w-full sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crop Profile Photo</DialogTitle>
            <DialogDescription>
              Drag to adjust the crop area. The image will be cropped to a square shape.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {cropImage && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                aspect={1}
                circularCrop
                minWidth={100}
              >
                <Image
                  ref={imageRef as any}
                  src={cropImage}
                  alt="Crop preview"
                  width={800}
                  height={800}
                  style={{ maxWidth: '100%', maxHeight: '70vh', width: 'auto', height: 'auto' }}
                  priority
                  unoptimized // Needed for data URLs
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    const size = Math.min(img.width, img.height);
                    const x = (img.width - size) / 2;
                    const y = (img.height - size) / 2;
                    setCrop({
                      unit: 'px',
                      width: size,
                      height: size,
                      x,
                      y
                    });
                  }}
                />
              </ReactCrop>
            )}
          </div>
          <div className="flex justify-end gap-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCropDialog(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCropComplete}
              className="rounded-full bg-[#1B4332] hover:bg-[#8fbc55]"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Apply'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            className="rounded-full"
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
            className="rounded-full"
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
          className="bg-gray-50 rounded-full"
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
          value={formData.phone ? formatPhoneNumber(formData.phone) : ''}
          onChange={handleInputChange}
          placeholder="(123) 456-7890"
          autoComplete="off"
          data-form-type="other"
          className="rounded-full"
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
            className="rounded-full"
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
              className="rounded-full"
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
              className="rounded-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="addressState">State</Label>
            <StateDropdown
              states={states}
              selectedState={formData.addressState}
              onStateChange={(state) => setFormData(prev => ({ ...prev, addressState: state }))}
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
              className="rounded-full"
              maxLength={5}
              pattern="\d{5}"
              title="ZIP code must be 5 digits"
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