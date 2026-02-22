-- Create product_colors table (platform owner's color palette)
CREATE TABLE public.product_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hex_code TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_views table (front, back, left sleeve, right sleeve etc.)
CREATE TABLE public.product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  view_name TEXT NOT NULL,
  view_order INTEGER DEFAULT 0,
  mockup_image_url TEXT,
  design_area_top NUMERIC NOT NULL DEFAULT 0,
  design_area_left NUMERIC NOT NULL DEFAULT 0,
  design_area_width NUMERIC NOT NULL DEFAULT 100,
  design_area_height NUMERIC NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_folders table
CREATE TABLE public.user_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES public.user_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_uploads table
CREATE TABLE public.user_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  folder_id UUID REFERENCES public.user_folders(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  original_url TEXT NOT NULL,
  compressed_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create design_templates table (ready-made designs)
CREATE TABLE public.design_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved_designs table
CREATE TABLE public.saved_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  design_data JSONB NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_designs ENABLE ROW LEVEL SECURITY;

-- Public read policies for product-related tables
CREATE POLICY "Anyone can view active colors" ON public.product_colors FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view product views" ON public.product_views FOR SELECT USING (true);
CREATE POLICY "Anyone can view active templates" ON public.design_templates FOR SELECT USING (is_active = true);

-- User-specific policies
CREATE POLICY "Users can view their own folders" ON public.user_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own folders" ON public.user_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folders" ON public.user_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders" ON public.user_folders FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own uploads" ON public.user_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own uploads" ON public.user_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own uploads" ON public.user_uploads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own uploads" ON public.user_uploads FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own designs" ON public.saved_designs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own designs" ON public.saved_designs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own designs" ON public.saved_designs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own designs" ON public.saved_designs FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('user-uploads', 'user-uploads', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('design-templates', 'design-templates', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('product-mockups', 'product-mockups', true);

-- Storage policies
CREATE POLICY "Anyone can view uploads" ON storage.objects FOR SELECT USING (bucket_id IN ('user-uploads', 'design-templates', 'product-mockups'));
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their uploads" ON storage.objects FOR UPDATE USING (bucket_id = 'user-uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their uploads" ON storage.objects FOR DELETE USING (bucket_id = 'user-uploads' AND auth.role() = 'authenticated');

-- Insert sample product colors
INSERT INTO public.product_colors (name, hex_code, sort_order) VALUES
('White', '#FFFFFF', 1),
('Black', '#000000', 2),
('Navy Blue', '#1e3a5f', 3),
('Red', '#e53935', 4),
('Forest Green', '#2e7d32', 5),
('Gray', '#757575', 6),
('Royal Blue', '#1565c0', 7),
('Burgundy', '#6d1b1b', 8),
('Orange', '#ef6c00', 9),
('Yellow', '#fdd835', 10),
('Pink', '#ec407a', 11),
('Purple', '#7b1fa2', 12),
('Teal', '#00897b', 13),
('Brown', '#5d4037', 14),
('Cream', '#fffdd0', 15);

-- Insert sample products with views
INSERT INTO public.products (id, name, category) VALUES 
('11111111-1111-1111-1111-111111111111', 'Classic T-Shirt', 'Apparel'),
('22222222-2222-2222-2222-222222222222', 'Premium Hoodie', 'Apparel'),
('33333333-3333-3333-3333-333333333333', 'Coffee Mug', 'Drinkware'),
('44444444-4444-4444-4444-444444444444', 'Phone Case', 'Accessories'),
('55555555-5555-5555-5555-555555555555', 'Tote Bag', 'Bags');

-- Insert product views
INSERT INTO public.product_views (product_id, view_name, view_order, design_area_top, design_area_left, design_area_width, design_area_height) VALUES
('11111111-1111-1111-1111-111111111111', 'Front', 1, 20, 25, 50, 45),
('11111111-1111-1111-1111-111111111111', 'Back', 2, 15, 25, 50, 50),
('11111111-1111-1111-1111-111111111111', 'Left Sleeve', 3, 30, 10, 20, 25),
('11111111-1111-1111-1111-111111111111', 'Right Sleeve', 4, 30, 70, 20, 25),
('22222222-2222-2222-2222-222222222222', 'Front', 1, 25, 25, 50, 40),
('22222222-2222-2222-2222-222222222222', 'Back', 2, 20, 25, 50, 45),
('33333333-3333-3333-3333-333333333333', 'Front', 1, 20, 20, 60, 50),
('44444444-4444-4444-4444-444444444444', 'Front', 1, 10, 15, 70, 80),
('55555555-5555-5555-5555-555555555555', 'Front', 1, 15, 20, 60, 55),
('55555555-5555-5555-5555-555555555555', 'Back', 2, 15, 20, 60, 55),
('55555555-5555-5555-5555-555555555555', 'Left Side', 3, 20, 5, 25, 50),
('55555555-5555-5555-5555-555555555555', 'Right Side', 4, 20, 70, 25, 50);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_saved_designs_updated_at BEFORE UPDATE ON public.saved_designs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();