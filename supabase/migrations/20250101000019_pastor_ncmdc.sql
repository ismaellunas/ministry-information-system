-- A church representative may be the pastor. The NCMDC ID is that person's
-- District MIS identifier. It is optional, and only a pastor may have one.
alter table public.profiles
  add column is_pastor boolean not null default false,
  add column ncmdc_id text;

alter table public.profiles
  add constraint profiles_ncmdc_pastor_chk check (is_pastor or ncmdc_id is null),
  add constraint profiles_ncmdc_shape_chk check (
    ncmdc_id is null or ncmdc_id ~ '^[A-Za-z0-9-]{1,40}$'
  );

-- A person can change their own name and phone. They cannot mark themselves pastor
-- or write an NCMDC ID. Admin and the service role can.
create or replace function public.protect_pastor_mark()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' or public.app_is_admin() then
    return new;
  end if;
  new.is_pastor := old.is_pastor;
  new.ncmdc_id := old.ncmdc_id;
  return new;
end;
$$;

create trigger profiles_protect_pastor_mark
  before update on public.profiles
  for each row execute function public.protect_pastor_mark();
