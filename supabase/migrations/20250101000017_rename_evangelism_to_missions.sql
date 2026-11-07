-- The ministry option shown when adding a user is the row's name.
-- Keep the code so existing ministry assignments stay on this row.
update public.ministries
set name = 'Missions'
where code = 'EVANGELISM';
