-- Add category_id to attributes table
ALTER TABLE public.attributes 
ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_attributes_category_id ON public.attributes(category_id);

COMMENT ON COLUMN public.attributes.category_id IS 'Links attribute to specific product category. NULL means attribute is global (available for all categories).';