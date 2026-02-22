-- Storage policies for product-mockups bucket
-- Allow admins to upload files
CREATE POLICY "Admins can upload to product-mockups"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-mockups' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update files
CREATE POLICY "Admins can update product-mockups"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-mockups' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete files
CREATE POLICY "Admins can delete product-mockups"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-mockups' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow public read access to product-mockups (bucket is already public)
CREATE POLICY "Anyone can view product-mockups"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-mockups');