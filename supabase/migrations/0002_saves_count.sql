-- Denormalized like/save count on lists.
-- list_saves RLS only exposes a user's own rows, so total counts can't be read
-- via aggregate selects. Keep a maintained counter on lists instead.

alter table public.lists add column if not exists saves_count integer not null default 0;

-- SECURITY DEFINER so liking someone else's list can still bump its counter
-- (the liker isn't the list owner, so plain RLS would block the update).
create or replace function public.bump_saves_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.lists set saves_count = saves_count + 1 where id = new.list_id;
  elsif (tg_op = 'DELETE') then
    update public.lists set saves_count = greatest(saves_count - 1, 0) where id = old.list_id;
  end if;
  return null;
end;
$$;

drop trigger if exists list_saves_count on public.list_saves;
create trigger list_saves_count
  after insert or delete on public.list_saves
  for each row execute function public.bump_saves_count();

-- Backfill existing counts.
update public.lists l
  set saves_count = (select count(*) from public.list_saves s where s.list_id = l.id);
