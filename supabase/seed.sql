-- Seed data for development.
-- Ministries are inserted in the migration; no duplicate inserts here.
-- Add sample churches for local development.

insert into public.churches (name, pastor_name, is_active)
values
  ('Great Emmanuel Worship Church Inc.', 'Pastor Emmanuel', true),
  ('Grace Community Church', 'Pastor Grace', true),
  ('New Life Assembly', 'Pastor Life', true)
on conflict (name) do nothing;

-- Bootstrap admin for local `supabase db reset`. Remote/prod: `npm run seed:admin`.
do $$
declare
  admin_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
begin
  if exists (select 1 from auth.users where email = 'aognaawan@gmail.com') then
    return;
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    admin_id,
    'authenticated',
    'authenticated',
    'aognaawan@gmail.com',
    crypt('secret', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"GEWCI","last_name":"Pastor"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    admin_id,
    admin_id,
    jsonb_build_object('sub', admin_id::text, 'email', 'aognaawan@gmail.com'),
    'email',
    admin_id::text,
    now(),
    now(),
    now()
  );

  insert into public.profiles (id, first_name, last_name, is_active, must_change_password)
  values (admin_id, 'GEWCI', 'Pastor', true, false);

  insert into public.profile_roles (profile_id, role)
  values (admin_id, 'ADMIN');
end $$;
