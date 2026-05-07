'use client';

import { useState, useRef } from 'react';
import { Camera, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { compressImage } from '@/lib/image-utils';

interface PhotoInputProps {
  label: string;
  onUpload: (url: string) => void;
  value?: string;
  jobId?: string;
  subfolderName?: string;
}

export function PhotoInput({ label, onUpload, value, jobId, subfolderName }: PhotoInputProps) {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = localPreview || value;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploading) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setLocalPreview(localUrl);
    setUploading(true);

    try {
      let uploadFile: File;
      try {
        uploadFile = await compressImage(file);
      } catch {
        uploadFile = file;
      }

      // Upload server-side to avoid browser CORS restrictions with Google Drive
      const body = new FormData();
      body.append('file', uploadFile);
      if (jobId) body.append('jobId', jobId);
      if (subfolderName) body.append('subfolderName', subfolderName);

      const res = await fetch('/api/upload/photo', { method: 'POST', body });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const { url } = await res.json();

      onUpload(url);
      setTimeout(() => setLocalPreview(null), 100);

    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast.error(`Upload failed: ${error.message}. Please try again.`);
      setLocalPreview(null);
    } finally {
      setUploading(false);
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
