create table public.churches (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null unique,
  pastor_name   text,
  pastor_phone  text,
  address       text,
  facebook_page_url text,
  hotline_number    text,
  map_pin_url       text,
  logo_url          text,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger churches_updated
  before update on public.churches
  for each row execute function public.set_updated_at();
