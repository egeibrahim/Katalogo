-- product_gallery_images tablosunda UPDATE için RLS politikası yoktu; galeri sıralaması (sort_order) güncellenemiyordu.
-- Admins can update product gallery images (sıra değişikliği için gerekli)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'product_gallery_images' and policyname = 'Admins can update product gallery images'
  ) then
    create policy "Admins can update product gallery images" on public.product_gallery_images
      for update
      using (public.has_role(auth.uid(), 'admin'::public.app_role))
      with check (public.has_role(auth.uid(), 'admin'::public.app_role));
  end if;
end $$;
