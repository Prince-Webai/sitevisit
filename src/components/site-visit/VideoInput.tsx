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
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_VIDEO_MB = 250;
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

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

    // Basic type check
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file.');
      return;
    }

    // Size check
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`Video is too large. Max size is ${MAX_VIDEO_MB}MB.`);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setLocalPreview(localUrl);
    setUploading(true);
    setProgress(0);

    try {
      // 1. Get Resumable Upload URL from our API
      const initRes = await fetch('/api/upload/resumable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          jobId
        }),
      });

      if (!initRes.ok) throw new Error('Failed to initiate upload session');
      const { uploadUrl } = await initRes.json();

      // 2. Perform Chunked Upload
      let uploadedBytes = 0;
      const totalSize = file.size;

      while (uploadedBytes < totalSize) {
        const chunk = file.slice(uploadedBytes, Math.min(uploadedBytes + CHUNK_SIZE, totalSize));
        const end = uploadedBytes + chunk.size;
        
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Range': `bytes ${uploadedBytes}-${end - 1}/${totalSize}`,
          },
          body: chunk,
        });

        if (response.status === 308 || response.ok) {
          uploadedBytes = end;
          setProgress(Math.round((uploadedBytes / totalSize) * 100));
        } else {
          throw new Error(`Upload failed with status ${response.status}`);
        }
      }

      // 3. Get the File ID from the final response
      const finalRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes */${totalSize}`,
        }
      });
      
      // Google Drive returns 200 or 201 with metadata when finished
      const metadata = await finalRes.json();
      const driveFileId = metadata.id;

      // 4. Save to Supabase 'videos' table
      const { error: dbError } = await supabase
        .from('videos')
        .insert({
          job_id: jobId,
          file_name: file.name,
          drive_file_id: driveFileId,
          status: 'completed',
          metadata: { size: file.size, type: file.type }
        });

      if (dbError) console.error('Supabase DB error:', dbError);

      onUpload(driveFileId); // Return the Drive File ID
      toast.success('Video uploaded to Google Drive!');
      
      setTimeout(() => {
        setLocalPreview(null);
        setProgress(0);
      }, 100);

    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast.error(`Video upload failed: ${error.message}`);
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
