'use client';

import { useState, useRef } from 'react';
import { Video, X, Loader2, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface VideoInputProps {
  label: string;
  onUpload: (url: string) => void;
  value?: string;
  path?: string;
  jobId?: string;
}

const supabase = createClient();
const MAX_VIDEO_MB = 150;
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

// Derive a safe extension from the file's MIME type or name
function getVideoExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && fromName !== 'undefined' && fromName.length <= 4) return fromName;
  const mimeMap: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/mov': 'mov',
    'video/avi': 'avi',
    'video/webm': 'webm',
  };
  return mimeMap[file.type] ?? 'mp4';
}

export function VideoInput({ label, onUpload, value, path = 'videos', jobId }: VideoInputProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = localPreview || value;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploading) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject formats browsers can't play (MOV, AVI, etc.)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowedTypes = ['video/mp4', 'video/webm', 'video/x-m4v'];
    const allowedExts = ['mp4', 'webm', 'm4v'];
    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      toast.error('Please upload an MP4 video. MOV/AVI are not supported by browsers. On iPhone: Settings → Camera → Formats → Most Compatible.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size before attempting upload
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`Video is too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Please keep it under ${MAX_VIDEO_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setLocalPreview(localUrl);
    setUploading(true);
    setProgress(0);

    try {
      const ext = getVideoExtension(file);
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${ext}`;
      const folder = jobId ? `jobs/${jobId}/${path}` : `temp/${path}`;
      const filePath = `${folder}/${fileName}`;
      const contentType = file.type || 'video/mp4';

      // Simulate progress (Supabase JS v2 doesn't expose upload progress natively)
      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 85 ? prev + 5 : prev));
      }, 400);

      const { error } = await supabase.storage
        .from('site-visits')
        .upload(filePath, file, { contentType, upsert: true });

      clearInterval(progressInterval);

      if (error) {
        console.error('Supabase video upload error:', error);
        throw new Error(error.message || 'Storage upload failed');
      }

      setProgress(100);

      const { data: { publicUrl } } = supabase.storage
        .from('site-visits')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      setTimeout(() => {
        setLocalPreview(null);
        setProgress(0);
      }, 100);
    } catch (error: any) {
      console.error('Error uploading video:', error);
      const msg = error.message || 'Unknown error';
      toast.error(`Video upload failed: ${msg}. Please try again.`);
      setLocalPreview(null);
      setProgress(0);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearVideo = () => {
    setLocalPreview(null);
    setProgress(0);
    onUpload('');
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-charcoal">{label}</label>

      <div
        className={`relative group h-48 rounded-xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center gap-2
          ${preview ? 'border-primary bg-black' : 'border-light-gray hover:border-primary/50 bg-off-white'}
        `}
      >
        {preview ? (
          <>
            <video
              src={preview}
              loop
              muted
              playsInline
              controls={false}
              className="absolute inset-0 w-full h-full object-cover animate-fade-in opacity-80"
            />

            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
                <div className="w-40 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-white text-[11px] font-semibold">{progress}% uploading…</p>
              </div>
            )}

            {!uploading && (
              <button
                type="button"
                onClick={clearVideo}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {!uploading && (
              <>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md text-[10px] font-bold text-primary flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  VIDEO SAVED
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-white border border-light-gray flex items-center justify-center text-mid-gray group-hover:text-primary group-hover:scale-110 transition-all shadow-sm">
              <Video className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-dark-gray uppercase tracking-wider">Record Video</p>
              <p className="text-[9px] text-mid-gray mt-0.5">MP4 or WebM up to {MAX_VIDEO_MB} MB</p>
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
        accept="video/mp4,video/webm,.mp4,.webm,.m4v"
        className="hidden"
      />
    </div>
  );
}
