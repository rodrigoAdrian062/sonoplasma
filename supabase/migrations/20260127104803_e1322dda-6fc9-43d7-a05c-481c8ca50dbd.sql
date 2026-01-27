-- Create bucket for stage audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('stage-audios', 'stage-audios', true);

-- Allow anyone to read audio files (public bucket)
CREATE POLICY "Public access to audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'stage-audios');

-- Allow authenticated users to upload audio files
CREATE POLICY "Authenticated users can upload audios"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stage-audios');

-- Allow authenticated users to delete audio files
CREATE POLICY "Authenticated users can delete audios"
ON storage.objects FOR DELETE
USING (bucket_id = 'stage-audios');

-- Allow authenticated users to update audio files
CREATE POLICY "Authenticated users can update audios"
ON storage.objects FOR UPDATE
USING (bucket_id = 'stage-audios');