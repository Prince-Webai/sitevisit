'use client';

import { useState, useRef, useEffect } from 'react';
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

export function VideoInput({ label, onUpload, value, path = 'videos', jobId }: VideoInputProps) {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = localPreview || value;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploading) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview
    const localUrl = URL.createObjectURL(file);
    setLocalPreview(localUrl);
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const folder = jobId ? `jobs/${jobId}/${path}` : `temp/${path}`;
      const filePath = `${folder}/${fileName}`;

      const { error } = await supabase.storage
        .from('site-visits')
        .upload(filePath, file, {
          contentType: file.type || 'video/mp4',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('site-visits')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      setTimeout(() => setLocalPreview(null), 100);
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video. Please check your connection and try again.');
      setLocalPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearVideo = () => {
    setLocalPreview(null);
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
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
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
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-white border border-light-gray flex items-center justify-center text-mid-gray group-hover:text-primary group-hover:scale-110 transition-all shadow-sm">
              <Video className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-dark-gray uppercase tracking-wider">Record Video</p>
              <p className="text-[9px] text-mid-gray mt-0.5">MP4, MOV up to 50MB</p>
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
        accept="video/*"
        className="hidden"
      />
    </div>
  );
}
