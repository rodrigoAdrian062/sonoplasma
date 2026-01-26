-- Add column for custom icon image URL
ALTER TABLE public.sonoplastia_etapas 
ADD COLUMN icone_url TEXT DEFAULT NULL;

-- Create storage bucket for stage icons
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stage-icons', 'stage-icons', true);

-- Create storage policies for stage icons
CREATE POLICY "Anyone can view stage icons" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'stage-icons');

CREATE POLICY "Authenticated users can upload stage icons" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'stage-icons');

CREATE POLICY "Authenticated users can update stage icons" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'stage-icons');

CREATE POLICY "Authenticated users can delete stage icons" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'stage-icons');