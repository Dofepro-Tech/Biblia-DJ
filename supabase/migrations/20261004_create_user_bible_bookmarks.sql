create table if not exists public.user_bible_bookmarks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bookmarks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_bible_bookmarks_array check (jsonb_typeof(bookmarks) = 'array')
);

alter table public.user_bible_bookmarks enable row level security;

drop policy if exists "Users can read their own Bible bookmarks" on public.user_bible_bookmarks;
create policy "Users can read their own Bible bookmarks"
  on public.user_bible_bookmarks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own Bible bookmarks" on public.user_bible_bookmarks;
create policy "Users can create their own Bible bookmarks"
  on public.user_bible_bookmarks for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Bible bookmarks" on public.user_bible_bookmarks;
create policy "Users can update their own Bible bookmarks"
  on public.user_bible_bookmarks for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.user_bible_bookmarks to authenticated;