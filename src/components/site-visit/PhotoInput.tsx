'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
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

export function PhotoInput({ label, onUpload, value, path = 'visits', jobId }: PhotoInputProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Sync preview with external value changes
  useEffect(() => {
    if (value) setPreview(value);
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      // Compress image before upload (converts to JPEG)
      const compressedFile = await compressImage(file);
      
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.jpg`;
      const folder = jobId ? `jobs/${jobId}/${path}` : `temp/${path}`;
      const filePath = `${folder}/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
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

      onUpload(publicUrl);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      const msg = error.message || 'Connection lost';
      toast.error(`Upload failed: ${msg}. Please try again.`);
      setPreview(value || null);
    } finally {
      setUploading(false);
    }
  };

  const clearPhoto = () => {
    setPreview(null);
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
        capture="environment"
        className="hidden"
      />
    </div>
  );
}
