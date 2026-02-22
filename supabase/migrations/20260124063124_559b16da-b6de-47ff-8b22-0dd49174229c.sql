-- Fix STORAGE_EXPOSURE: Secure storage buckets with proper RLS policies

-- 1. Make buckets private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('user-uploads', 'design-templates', 'product-mockups');

-- 2. Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view design templates" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product mockups" ON storage.objects;

-- 3. Add secure policies for user-uploads bucket
-- Users can view only their own uploads
CREATE POLICY "Users can view their own uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload their own files
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own uploads
CREATE POLICY "Users can update their own uploads"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own uploads
CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Add policies for design-templates bucket
-- Only authenticated users can view templates
CREATE POLICY "Authenticated users can view design templates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'design-templates' 
  AND auth.role() = 'authenticated'
);

-- Only admins can manage design templates
CREATE POLICY "Admins can manage design templates"
ON storage.objects FOR ALL
USING (
  bucket_id = 'design-templates' 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'design-templates' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Add policies for product-mockups bucket
-- Public read access for product mockups (these are publicly displayed products)
CREATE POLICY "Public can view product mockups"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-mockups');

-- Only admins can manage product mockups
CREATE POLICY "Admins can manage product mockups"
ON storage.objects FOR ALL
USING (
  bucket_id = 'product-mockups' 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'product-mockups' 
  AND has_role(auth.uid(), 'admin'::app_role)
);