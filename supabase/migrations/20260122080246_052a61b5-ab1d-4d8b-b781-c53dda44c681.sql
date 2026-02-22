-- Fix: Postgres doesn't support `create policy if not exists` in all versions.

-- Delivery regions selectable in storefront
create table if not exists public.delivery_regions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.delivery_regions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'delivery_regions'
      and policyname = 'Admins can manage delivery regions'
  ) then
    execute 'create policy "Admins can manage delivery regions" on public.delivery_regions for all using (has_role(auth.uid(), ''admin''::app_role)) with check (has_role(auth.uid(), ''admin''::app_role))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'delivery_regions'
      and policyname = 'Public can view active delivery regions'
  ) then
    execute 'create policy "Public can view active delivery regions" on public.delivery_regions for select using (is_active = true)';
  end if;
end $$;

-- Shipping overrides per delivery region
create table if not exists public.delivery_region_shipping_overrides (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null unique references public.delivery_regions(id) on delete cascade,
  shipping_tip text null,
  shipping_method_name text null,
  shipping_method_time_text text null,
  shipping_method_cost_from_text text null,
  shipping_method_additional_item_text text null,
  production_time_text text null,
  shipping_time_text text null,
  total_fulfillment_time_text text null,
  estimated_delivery_text text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.delivery_region_shipping_overrides enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'delivery_region_shipping_overrides'
      and policyname = 'Admins can manage region shipping overrides'
  ) then
    execute 'create policy "Admins can manage region shipping overrides" on public.delivery_region_shipping_overrides for all using (has_role(auth.uid(), ''admin''::app_role)) with check (has_role(auth.uid(), ''admin''::app_role))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'delivery_region_shipping_overrides'
      and policyname = 'Public can view region shipping overrides'
  ) then
    execute 'create policy "Public can view region shipping overrides" on public.delivery_region_shipping_overrides for select using (true)';
  end if;
end $$;

-- Helpful indexes
create index if not exists idx_delivery_regions_active_sort
on public.delivery_regions (is_active, sort_order, name);

create index if not exists idx_region_overrides_region_id
on public.delivery_region_shipping_overrides (region_id);

-- Seed common regions (safe/ idempotent)
insert into public.delivery_regions (name, sort_order, is_active)
values
  ('Turkey', 10, true),
  ('United States', 20, true),
  ('United Kingdom', 30, true),
  ('Germany', 40, true)
on conflict (name) do update set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
