-- Every church representative on the district list has an NCMDC ID.
-- The pastor mark stays separate. The ID is no longer limited to pastors.
alter table public.profiles drop constraint if exists profiles_ncmdc_pastor_chk;
