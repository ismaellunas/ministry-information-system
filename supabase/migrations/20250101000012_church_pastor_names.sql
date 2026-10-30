alter table public.churches
  add column if not exists pastor_first_name text,
  add column if not exists pastor_last_name text;

update public.churches
set
  pastor_first_name = nullif(split_part(trim(pastor_name), ' ', 1), ''),
  pastor_last_name = nullif(
    trim(substr(trim(pastor_name), length(split_part(trim(pastor_name), ' ', 1)) + 2)),
    ''
  )
where pastor_name is not null
  and pastor_first_name is null
  and pastor_last_name is null;
