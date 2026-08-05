-- ===========================================================================
-- 0006_list_comments.sql — flat comments on lists.
-- Anyone who can see a list can comment on it; authors edit/delete their own
-- comments, and a list owner can delete any comment on their list. Comments are
-- reportable UGC (App Store Guideline 1.2), so 'comment' joins the report types.
-- ===========================================================================

create table if not exists public.list_comments (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.lists (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists list_comments_list_id_idx on public.list_comments (list_id, created_at desc);
create index if not exists list_comments_author_idx on public.list_comments (author_id);

create trigger list_comments_set_updated_at
  before update on public.list_comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Denormalized comment count on lists (mirrors saves_count; a commenter isn't
-- the list owner, so the counter bump needs SECURITY DEFINER to bypass RLS).
-- ---------------------------------------------------------------------------
alter table public.lists add column if not exists comments_count integer not null default 0;

create or replace function public.bump_comments_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.lists set comments_count = comments_count + 1 where id = new.list_id;
  elsif (tg_op = 'DELETE') then
    update public.lists set comments_count = greatest(comments_count - 1, 0) where id = old.list_id;
  end if;
  return null;
end;
$$;

drop trigger if exists list_comments_count on public.list_comments;
create trigger list_comments_count
  after insert or delete on public.list_comments
  for each row execute function public.bump_comments_count();

-- Trigger-only function; nothing should invoke it via PostgREST (matches 0005).
revoke execute on function public.bump_comments_count() from public, anon, authenticated;

-- Backfill (no-op on a fresh table, but keeps re-runs correct).
update public.lists l
  set comments_count = (select count(*) from public.list_comments c where c.list_id = l.id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.list_comments enable row level security;

-- Readable whenever the parent list is visible to the caller.
create policy "comments follow parent list visibility"
  on public.list_comments for select
  to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_id and (l.is_public or l.owner_id = auth.uid())
    )
  );

-- Anyone who can see the list may add a comment, as themselves.
create policy "users can comment on lists they can see"
  on public.list_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.lists l
      where l.id = list_id and (l.is_public or l.owner_id = auth.uid())
    )
  );

-- Authors edit only their own comments.
create policy "authors can edit their own comments"
  on public.list_comments for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- Authors delete their own comments; a list owner can delete any on their list.
create policy "authors or list owners can delete comments"
  on public.list_comments for delete
  to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.lists l
      where l.id = list_id and l.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Comments are reportable content.
-- ---------------------------------------------------------------------------
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports
  add constraint reports_target_type_check
  check (target_type in ('list', 'user', 'place', 'comment'));
