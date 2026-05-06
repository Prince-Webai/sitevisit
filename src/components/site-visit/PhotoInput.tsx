'use client';

import { useState, useRef } from 'react';
import { Camera, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { compressImage } from '@/lib/image-utils';

interface PhotoInputProps {
  label: string;
  onUpload: (url: string) => void;
  value?: string;
  path?: string;
  jobId?: string;
}

const supabase = createClient();

export function PhotoInput({ label, onUpload, value, path = 'visits', jobId }: PhotoInputProps) {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use local preview if available, otherwise fallback to the value from props
  const preview = localPreview || value;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploading) return;
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('Starting photo upload:', file.name, file.size);
    // Show local preview immediately for better UX
    const localUrl = URL.createObjectURL(file);
    setLocalPreview(localUrl);
    setUploading(true);

    try {
      // Compress image before upload; fall back to original if format is unsupported (e.g. HEIC)
      let compressedFile: File;
      try {
        compressedFile = await compressImage(file);
      } catch {
        compressedFile = file;
      }
      
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.jpg`;
      const folder = jobId ? `jobs/${jobId}/${path}` : `temp/${path}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-visits')
        .upload(filePath, compressedFile, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(uploadError.message || 'Storage upload failed');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('site-visits')
        .getPublicUrl(filePath);

      // Notify parent about the new URL
      onUpload(publicUrl);
      
      // Clear local preview so we switch to the public URL from props
      // We do this after a short delay or in the next tick to prevent flickering
      // if the parent re-render takes a moment.
      setTimeout(() => setLocalPreview(null), 100);
      
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      const msg = error.message || 'Connection lost';
      toast.error(`Upload failed: ${msg}. Please try again.`);
      setLocalPreview(null);
    } finally {
      setUploading(false);
      // Clear input value so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearPhoto = () => {
    setLocalPreview(null);
    onUpload('');
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-charcoal">{label}</label>
      
      <div 
        className={`relative group h-40 rounded-xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center gap-2
          ${preview ? 'border-primary bg-green-50/10' : 'border-light-gray hover:border-primary/50 bg-off-white'}
        `}
      >
        {preview ? (
          <>
            <img 
              src={preview} 
              alt={label} 
              className="absolute inset-0 w-full h-full object-cover animate-fade-in"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
            {!uploading && (
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md text-[10px] font-bold text-primary flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3 h-3" />
              UPLOADED
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-white border border-light-gray flex items-center justify-center text-mid-gray group-hover:text-primary group-hover:scale-110 transition-all shadow-sm">
              <Camera className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-dark-gray uppercase tracking-wider">Tap to Capture</p>
              <p className="text-[9px] text-mid-gray mt-0.5">JPG, PNG up to 10MB</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
