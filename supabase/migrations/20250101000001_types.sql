-- Enumerated types
create type public.user_role as enum
  ('ADMIN', 'SECTION_PRESBYTERY', 'SECTION_MINISTRY_REP', 'CHURCH_REP');

create type public.activity_scope as enum ('LOCAL', 'SECTIONAL');

create type public.event_visibility as enum ('CHURCH_ONLY', 'PUBLIC');

create type public.audience_label as enum (
  'PASTORS_ONLY', 'ALL_CHURCHES', 'PUBLIC',
  'MM_ONLY', 'WM_ONLY', 'YA_ONLY', 'MM_AND_WM', 'CHRISTIAN_EDUCATION'
);
