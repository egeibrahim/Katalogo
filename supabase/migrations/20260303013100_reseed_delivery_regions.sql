-- Re-seed Deliver-to regions so the storefront dropdown is restored.
-- This script can safely run multiple times; it upserts by name.
insert into public.delivery_regions (name, sort_order, is_active)
values
  ('All Country', 0, true),
  ('Turkey', 10, true),
  ('United States', 20, true),
  ('United Kingdom', 30, true),
  ('Germany', 40, true),
  ('France', 50, true),
  ('Spain', 60, true),
  ('Italy', 70, true),
  ('Netherlands', 80, true),
  ('Canada', 90, true),
  ('United Arab Emirates', 100, true)
on conflict (name) do update set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
