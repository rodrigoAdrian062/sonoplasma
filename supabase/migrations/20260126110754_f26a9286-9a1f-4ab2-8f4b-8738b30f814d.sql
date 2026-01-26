-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);

-- Create policy for public read access
CREATE POLICY "Anyone can view logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');

-- Create policy for public upload
CREATE POLICY "Anyone can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'logos');

-- Create policy for public update
CREATE POLICY "Anyone can update logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'logos');

-- Create policy for public delete
CREATE POLICY "Anyone can delete logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'logos');