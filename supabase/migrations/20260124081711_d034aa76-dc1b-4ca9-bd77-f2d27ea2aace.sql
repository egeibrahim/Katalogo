-- Seed global SEO/brand settings into app_settings
INSERT INTO public.app_settings (key, value)
VALUES
  ('site_name', 'Newcatalog'),
  ('title_template', '{title} | {site}'),
  ('default_meta_description', 'Newcatalog ile ürün kataloğunu tasarla, yönet ve yayınla.'),
  ('default_og_image_url', '')
ON CONFLICT (key) DO NOTHING;