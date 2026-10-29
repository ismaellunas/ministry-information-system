create table public.profiles (
  id                   uuid        primary key references auth.users(id) on delete cascade,
  first_name           text        not null,
  last_name            text        not null,
  phone_number         text,
  is_active            boolean     not null default true,
  must_change_password boolean     not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();
