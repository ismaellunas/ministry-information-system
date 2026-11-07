-- Pastor birthday is a church record, not a member and not a calendar event.
-- Only Admin and that church's representatives can read or write it.
create table public.church_pastor_birthdays (
  church_id   uuid        primary key references public.churches(id) on delete cascade,
  birth_month smallint    check (birth_month between 1 and 12),
  birth_day   smallint    check (birth_day between 1 and 31),
  birth_year  smallint    check (birth_year between 1900 and extract(year from now())::int),
  constraint pastor_birthday_pair check (
    (birth_month is null and birth_day is null) or
    (birth_month is not null and birth_day is not null)
  ),
  constraint pastor_valid_month_day check (
    birth_day is null or birth_day <= case birth_month
      when 2  then 29
      when 4  then 30
      when 6  then 30
      when 9  then 30
      when 11 then 30
      else 31
    end
  )
);

alter table public.church_pastor_birthdays enable row level security;

grant select, insert, update, delete on public.church_pastor_birthdays to authenticated, service_role;

create policy "pastor_birthday_read"
  on public.church_pastor_birthdays for select
  to authenticated
  using (
    public.app_is_active()
    and (
      public.app_is_admin()
      or church_id in (select public.app_church_ids())
    )
  );

create policy "pastor_birthday_insert"
  on public.church_pastor_birthdays for insert
  to authenticated
  with check (
    public.app_is_active()
    and (
      public.app_is_admin()
      or church_id in (select public.app_church_ids())
    )
  );

create policy "pastor_birthday_update"
  on public.church_pastor_birthdays for update
  to authenticated
  using (
    public.app_is_active()
    and (
      public.app_is_admin()
      or church_id in (select public.app_church_ids())
    )
  )
  with check (
    public.app_is_admin()
    or church_id in (select public.app_church_ids())
  );

create policy "pastor_birthday_delete"
  on public.church_pastor_birthdays for delete
  to authenticated
  using (
    public.app_is_active()
    and (
      public.app_is_admin()
      or church_id in (select public.app_church_ids())
    )
  );
