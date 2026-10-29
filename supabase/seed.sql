-- Seed data for development.
-- Ministries are inserted in the migration; no duplicate inserts here.
-- Add sample churches for local development.

insert into public.churches (name, pastor_name, is_active)
values
  ('Great Emmanuel Worship Church Inc.', 'Pastor Emmanuel', true),
  ('Grace Community Church', 'Pastor Grace', true),
  ('New Life Assembly', 'Pastor Life', true)
on conflict (name) do nothing;
