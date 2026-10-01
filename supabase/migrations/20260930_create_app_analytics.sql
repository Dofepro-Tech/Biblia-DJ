-- First native app launch is recorded once per local app installation.
-- Download events record button clicks, not confirmed APK transfers.
create table if not exists public.app_installations (
  installation_id_hash text primary key check (char_length(installation_id_hash) = 64),
  platform text not null check (platform in ('android', 'ios')),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  first_open_at timestamptz not null default now()
);

create table if not exists public.app_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in (
    'app_open', 'apk_download_click', 'bible_read', 'search_query',
    'share_content', 'game_start', 'theme_change'
  )),
  platform text not null check (char_length(platform) <= 20),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  created_at timestamptz not null default now()
);

create index if not exists app_analytics_events_name_date_idx
  on public.app_analytics_events (event_name, created_at desc);

alter table public.app_installations enable row level security;
alter table public.app_analytics_events enable row level security;

revoke all on table public.app_installations from anon, authenticated;
revoke all on table public.app_analytics_events from anon, authenticated;
grant select, insert on table public.app_installations to service_role;
grant select, insert on table public.app_analytics_events to service_role;
