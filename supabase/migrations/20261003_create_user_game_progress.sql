create table if not exists public.user_game_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_game_progress enable row level security;

create policy "Users can read their own game progress"
  on public.user_game_progress for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own game progress"
  on public.user_game_progress for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own game progress"
  on public.user_game_progress for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.user_game_progress to authenticated;