-- Create venue-images storage bucket for admin image uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-images',
  'venue-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for venue-images storage bucket
-- Anyone can view/read images (public bucket)
CREATE POLICY "Public can read venue images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'venue-images');

-- Only admins can upload images
CREATE POLICY "Admins can upload venue images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'venue-images' AND
  has_role(auth.uid(), 'admin')
);

-- Only admins can update images
CREATE POLICY "Admins can update venue images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'venue-images' AND
  has_role(auth.uid(), 'admin')
);

-- Only admins can delete images
CREATE POLICY "Admins can delete venue images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'venue-images' AND
  has_role(auth.uid(), 'admin')
);
