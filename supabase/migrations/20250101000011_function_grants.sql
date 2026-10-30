grant execute on function public.church_summary() to authenticated;
grant execute on function public.official_member_count(uuid, smallint) to authenticated;
grant execute on function public.app_is_active() to authenticated;
grant execute on function public.app_church_id() to authenticated;
grant execute on function public.app_ministry_id() to authenticated;
grant execute on function public.app_is_admin() to authenticated;
grant execute on function public.app_is_presbytery() to authenticated;
