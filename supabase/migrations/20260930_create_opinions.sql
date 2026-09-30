-- Opinions are read and written by the Express backend using the service role.
-- Anonymous and authenticated clients must not access this table directly.
create table if not exists public.opinions (
  id bigint generated always as identity primary key,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  author_name text not null default 'Anónimo' check (char_length(author_name) <= 80),
  created_at timestamptz not null default now(),
  author_email text check (author_email is null or char_length(author_email) <= 254)
);

alter table public.opinions
  add column if not exists author_email text;

create index if not exists opinions_created_at_idx
  on public.opinions (created_at desc);

alter table public.opinions enable row level security;

revoke all on table public.opinions from anon, authenticated;
grant select, insert on table public.opinions to service_role;
grant usage, select on sequence public.opinions_id_seq to service_role;
