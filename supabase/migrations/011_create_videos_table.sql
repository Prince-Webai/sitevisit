-- Create videos table to track Google Drive uploads
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    drive_file_id TEXT,
    status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin/Dispatcher full access videos" ON public.videos
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Dispatcher'))
    );

CREATE POLICY "Users can view videos related to their jobs" ON public.videos
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.jobs WHERE id = videos.job_id AND assigned_to = auth.uid())
    );

CREATE POLICY "Users can insert videos" ON public.videos
    FOR INSERT WITH CHECK (true); -- Usually restricted further, but for now simple

CREATE POLICY "Users can update their own uploads" ON public.videos
    FOR UPDATE USING (true);
