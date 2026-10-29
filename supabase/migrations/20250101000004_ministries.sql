create table public.ministries (
  id                      smallint generated always as identity primary key,
  code                    text     not null unique,
  name                    text     not null,
  tracks_membership       boolean  not null,
  allows_churchless_rep   boolean  not null default false
);

insert into public.ministries (code, name, tracks_membership, allows_churchless_rep) values
  ('MM',         'Men''s Ministry',       true,  false),
  ('WM',         'Women''s Ministry',     true,  false),
  ('YA',         'Youth Alive',           true,  false),
  ('CE',         'Christian Education',   true,  false),
  ('MUSIC',      'Music',                 false, false),
  ('EVANGELISM', 'Evangelism',            false, true);
