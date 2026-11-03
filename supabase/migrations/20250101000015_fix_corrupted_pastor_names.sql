-- 20250101000012_church_pastor_names.sql backfilled pastor_first_name/pastor_last_name
-- by splitting pastor_name on its first space. For any church whose pastor_name was
-- already stored in the app's JSON encoding ({"first":"Juan","last":"Dela Cruz"}) at
-- backfill time, that split landed inside the JSON and produced garbage columns, e.g.
-- pastor_first_name = '{"first":"Juan","last":"Dela' and pastor_last_name = 'Cruz"}'.
-- Those garbage columns then took priority over the still-valid pastor_name JSON in
-- toChurch(), surfacing the raw JSON as the displayed pastor name.
--
-- Re-derive the two columns from pastor_name for exactly the rows showing that
-- corruption signature (a dedicated column itself contains JSON punctuation).
update public.churches
set
  pastor_first_name = nullif(pastor_name::jsonb ->> 'first', ''),
  pastor_last_name = nullif(pastor_name::jsonb ->> 'last', '')
where pastor_name is not null
  and trim(pastor_name) ~ '^\{.*\}$'
  and (pastor_first_name like '{%' or pastor_last_name like '%}');
