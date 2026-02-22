-- Attributes management (compatible create-type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'attribute_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.attribute_type AS ENUM ('text','number','select','multiselect');
  END IF;
END $$;

create table if not exists public.attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key text not null unique,
  type public.attribute_type not null default 'text',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.attributes enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='attributes' and policyname='Public can view attributes'
  ) then
    create policy "Public can view attributes" on public.attributes
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='attributes' and policyname='Admins can manage attributes'
  ) then
    create policy "Admins can manage attributes" on public.attributes
      for all using (has_role(auth.uid(), 'admin'::app_role))
      with check (has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_attributes_touch_updated_at') THEN
    create trigger trg_attributes_touch_updated_at
    before update on public.attributes
    for each row
    execute function public.touch_updated_at();
  END IF;
END $$;

create table if not exists public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.attributes(id) on delete cascade,
  value text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(attribute_id, value)
);

create index if not exists idx_attribute_values_attribute_id on public.attribute_values(attribute_id);

alter table public.attribute_values enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='attribute_values' and policyname='Public can view attribute values'
  ) then
    create policy "Public can view attribute values" on public.attribute_values
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='attribute_values' and policyname='Admins can manage attribute values'
  ) then
    create policy "Admins can manage attribute values" on public.attribute_values
      for all using (has_role(auth.uid(), 'admin'::app_role))
      with check (has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;

-- storage select for admins (media library)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Admins can view product-mockups'
  ) then
    create policy "Admins can view product-mockups"
    on storage.objects
    for select
    using (bucket_id = 'product-mockups' and has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;