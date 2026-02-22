-- Add product color variations per product
CREATE TABLE public.product_color_variants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES public.product_colors(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id, color_id)
);

-- Enable RLS
ALTER TABLE public.product_color_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_color_variants
CREATE POLICY "Anyone can view product color variants"
ON public.product_color_variants
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert product color variants"
ON public.product_color_variants
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product color variants"
ON public.product_color_variants
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete product color variants"
ON public.product_color_variants
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add mockup images per color per view
CREATE TABLE public.product_view_color_mockups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_view_id UUID NOT NULL REFERENCES public.product_views(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES public.product_colors(id) ON DELETE CASCADE,
    mockup_image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_view_id, color_id)
);

-- Enable RLS
ALTER TABLE public.product_view_color_mockups ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_view_color_mockups
CREATE POLICY "Anyone can view color mockups"
ON public.product_view_color_mockups
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert color mockups"
ON public.product_view_color_mockups
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update color mockups"
ON public.product_view_color_mockups
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete color mockups"
ON public.product_view_color_mockups
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage product_colors table (add/edit colors)
CREATE POLICY "Admins can insert product colors"
ON public.product_colors
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product colors"
ON public.product_colors
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete product colors"
ON public.product_colors
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));