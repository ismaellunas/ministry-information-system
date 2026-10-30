-- pgTAP tests for Phase 1 schema and RLS.
-- Run with: supabase test db

begin;

select plan(21);

-- Tables exist
select has_table('public', 'churches', 'churches table exists');
select has_table('public', 'ministries', 'ministries table exists');
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'profile_roles', 'profile_roles table exists');
select has_table('public', 'members', 'members table exists');
select has_table('public', 'church_department_counts', 'church_department_counts table exists');
select has_table('public', 'activities', 'activities table exists');
select has_table('public', 'activity_conflicts', 'activity_conflicts table exists');
select has_table('public', 'notifications', 'notifications table exists');
select has_table('public', 'push_subscriptions', 'push_subscriptions table exists');
select has_table('public', 'audit_log', 'audit_log table exists');

-- Ministries seeded correctly
select is(count(*)::int, 6, '6 ministries seeded')
  from public.ministries;

select is(
  (select count(*)::int from public.ministries where tracks_membership),
  4,
  '4 ministries track membership (MM, WM, YA, CE)'
);

select is(
  (select count(*)::int from public.ministries where allows_churchless_rep),
  1,
  'Only EVANGELISM allows a churchless rep'
);

-- Enums exist
select has_type('public', 'user_role', 'user_role enum exists');
select has_type('public', 'activity_scope', 'activity_scope enum exists');
select has_type('public', 'event_visibility', 'event_visibility enum exists');
select has_type('public', 'audience_label', 'audience_label enum exists');

-- Functions exist
select has_function('public', 'app_is_active', 'app_is_active() exists');
select has_function('public', 'app_church_id', 'app_church_id() exists');
select has_function('public', 'app_is_admin', 'app_is_admin() exists');

select * from finish();
rollback;
