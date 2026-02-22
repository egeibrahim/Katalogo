-- Admin catalog core tables for Tapstitch-like system

-- 1) Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  cover_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='Public can view categories'
  ) then
    create policy "Public can view categories" on public.categories
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='Admins can insert categories'
  ) then
    create policy "Admins can insert categories" on public.categories
      for insert with check (has_role(auth.uid(), 'admin'::app_role));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='Admins can update categories'
  ) then
    create policy "Admins can update categories" on public.categories
      for update using (has_role(auth.uid(), 'admin'::app_role))
      with check (has_role(auth.uid(), 'admin'::app_role));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='Admins can delete categories'
  ) then
    create policy "Admins can delete categories" on public.categories
      for delete using (has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;

-- 2) Extend existing products table to support admin form
alter table public.products
  add column if not exists product_code text,
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists slug text,
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists cover_image_url text;

create index if not exists idx_products_category_id on public.products(category_id);
create unique index if not exists idx_products_slug_unique on public.products(slug) where slug is not null;

-- 3) Product attributes (Tapstitch filter fields) as JSONB for flexibility
create table if not exists public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id)
);

alter table public.product_attributes enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_attributes' and policyname='Public can view product attributes'
  ) then
    create policy "Public can view product attributes" on public.product_attributes
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_attributes' and policyname='Admins can insert product attributes'
  ) then
    create policy "Admins can insert product attributes" on public.product_attributes
      for insert with check (has_role(auth.uid(), 'admin'::app_role));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_attributes' and policyname='Admins can update product attributes'
  ) then
    create policy "Admins can update product attributes" on public.product_attributes
      for update using (has_role(auth.uid(), 'admin'::app_role))
      with check (has_role(auth.uid(), 'admin'::app_role));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_attributes' and policyname='Admins can delete product attributes'
  ) then
    create policy "Admins can delete product attributes" on public.product_attributes
      for delete using (has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;

-- 4) Mockups (front/back/side) + print area coordinates
create table if not exists public.product_mockups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  front_image_url text,
  back_image_url text,
  side_image_url text,
  print_area_x numeric,
  print_area_y numeric,
  print_area_width numeric,
  print_area_height numeric,
  export_resolution integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id)
);

alter table public.product_mockups enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_mockups' and policyname='Public can view product mockups'
  ) then
    create policy "Public can view product mockups" on public.product_mockups
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_mockups' and policyname='Admins can insert product mockups'
  ) then
    create policy "Admins can insert product mockups" on public.product_mockups
      for insert with check (has_role(auth.uid(), 'admin'::app_role));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_mockups' and policyname='Admins can update product mockups'
  ) then
    create policy "Admins can update product mockups" on public.product_mockups
      for update using (has_role(auth.uid(), 'admin'::app_role))
      with check (has_role(auth.uid(), 'admin'::app_role));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_mockups' and policyname='Admins can delete product mockups'
  ) then
    create policy "Admins can delete product mockups" on public.product_mockups
      for delete using (has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;

-- 5) Gallery images
create table if not exists public.product_gallery_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_gallery_images_product_id on public.product_gallery_images(product_id);

alter table public.product_gallery_images enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_gallery_images' and policyname='Public can view product gallery images'
  ) then
    create policy "Public can view product gallery images" on public.product_gallery_images
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_gallery_images' and policyname='Admins can insert product gallery images'
  ) then
    create policy "Admins can insert product gallery images" on public.product_gallery_images
      for insert with check (has_role(auth.uid(), 'admin'::app_role));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_gallery_images' and policyname='Admins can delete product gallery images'
  ) then
    create policy "Admins can delete product gallery images" on public.product_gallery_images
      for delete using (has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;

-- 6) Sizes + product size variants
create table if not exists public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.product_sizes enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_sizes' and policyname='Public can view product sizes'
  ) then
    create policy "Public can view product sizes" on public.product_sizes
      for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_sizes' and policyname='Admins can manage product sizes'
  ) then
    create policy "Admins can manage product sizes" on public.product_sizes
      for all using (has_role(auth.uid(), 'admin'::app_role))
      with check (has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;

create table if not exists public.product_size_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_id uuid not null references public.product_sizes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (product_id, size_id)
);

alter table public.product_size_variants enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_size_variants' and policyname='Public can view product size variants'
  ) then
    create policy "Public can view product size variants" on public.product_size_variants
      for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_size_variants' and policyname='Admins can manage product size variants'
  ) then
    create policy "Admins can manage product size variants" on public.product_size_variants
      for all using (has_role(auth.uid(), 'admin'::app_role))
      with check (has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;

-- 7) updated_at triggers
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- products has updated_at already; attach trigger if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_products_touch_updated_at'
  ) THEN
    CREATE TRIGGER trg_products_touch_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_categories_touch_updated_at'
  ) THEN
    CREATE TRIGGER trg_categories_touch_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_product_attributes_touch_updated_at'
  ) THEN
    CREATE TRIGGER trg_product_attributes_touch_updated_at
    BEFORE UPDATE ON public.product_attributes
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_product_mockups_touch_updated_at'
  ) THEN
    CREATE TRIGGER trg_product_mockups_touch_updated_at
    BEFORE UPDATE ON public.product_mockups
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

-- 8) Storage policies for admin uploads to product-mockups bucket
-- NOTE: bucket already exists and is public.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can upload to product-mockups'
  ) THEN
    CREATE POLICY "Admins can upload to product-mockups"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'product-mockups' AND has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can update product-mockups'
  ) THEN
    CREATE POLICY "Admins can update product-mockups"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'product-mockups' AND has_role(auth.uid(), 'admin'::app_role)
    )
    WITH CHECK (
      bucket_id = 'product-mockups' AND has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can delete product-mockups'
  ) THEN
    CREATE POLICY "Admins can delete product-mockups"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'product-mockups' AND has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;