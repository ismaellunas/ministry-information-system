-- Storage bucket for church logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-logos',
  'church-logos',
  true,
  204800,  -- 200 KB
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

-- Anyone may read (public bucket)
create policy "church_logos_read"
  on storage.objects for select
  to public
  using (bucket_id = 'church-logos');

-- Admin or that church's rep may upload/update
create policy "church_logos_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'church-logos'
    and public.app_is_active()
    and (
      public.app_is_admin()
      or (
        -- Path is churches/{church_id}/logo.webp
        (storage.foldername(name))[1] = 'churches'
        and (storage.foldername(name))[2] = public.app_church_id()::text
      )
    )
  );

create policy "church_logos_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'church-logos'
    and public.app_is_active()
    and (
      public.app_is_admin()
      or (storage.foldername(name))[2] = public.app_church_id()::text
    )
  );
