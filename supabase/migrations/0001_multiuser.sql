-- ============================================================================
-- Full setup: base tables + multi-user + STEM history
-- Aman dijalankan di project Supabase kosong.
-- ============================================================================

-- 1) Tabel dasar
create table if not exists public.folders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  parent_id   uuid references public.folders(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'Untitled',
  content     text not null default '',
  folder_id   uuid references public.folders(id) on delete set null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  pinned      boolean not null default false,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) Tabel histori STEM Studio
create table if not exists public.stem_analyses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  subject     text not null,
  topic       text,
  title       text not null,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.stem_cheatsheets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  subject     text not null,
  topic       text,
  title       text not null,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.stem_quiz_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  subject         text not null,
  difficulty      text not null,
  mode            text not null,
  topic           text,
  questions       jsonb not null,
  answers         jsonb not null,
  score           integer not null,
  total           integer not null,
  elapsed_seconds integer not null,
  created_at      timestamptz not null default now()
);

-- 3) Index untuk performa
create index if not exists notes_user_id_idx          on public.notes(user_id);
create index if not exists notes_user_updated_idx     on public.notes(user_id, updated_at desc);
create index if not exists notes_folder_id_idx        on public.notes(folder_id);
create index if not exists folders_user_id_idx        on public.folders(user_id);
create index if not exists folders_parent_id_idx      on public.folders(parent_id);
create index if not exists stem_analyses_user_idx     on public.stem_analyses(user_id, created_at desc);
create index if not exists stem_cheatsheets_user_idx  on public.stem_cheatsheets(user_id, created_at desc);
create index if not exists stem_quiz_user_idx         on public.stem_quiz_attempts(user_id, created_at desc);

-- 4) Trigger auto-update updated_at pada notes
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row
  execute function public.touch_updated_at();

-- 5) Aktifkan RLS
alter table public.folders              enable row level security;
alter table public.notes                enable row level security;
alter table public.stem_analyses        enable row level security;
alter table public.stem_cheatsheets     enable row level security;
alter table public.stem_quiz_attempts   enable row level security;

-- 6) Policy — CRUD hanya untuk owner
do $$
declare t text;
begin
  foreach t in array array['folders','notes','stem_analyses','stem_cheatsheets','stem_quiz_attempts']
  loop
    execute format('drop policy if exists %I_select_own on public.%I', t, t);
    execute format('drop policy if exists %I_insert_own on public.%I', t, t);
    execute format('drop policy if exists %I_update_own on public.%I', t, t);
    execute format('drop policy if exists %I_delete_own on public.%I', t, t);

    execute format('create policy %I_select_own on public.%I for select using (auth.uid() = user_id)', t, t);
    execute format('create policy %I_insert_own on public.%I for insert with check (auth.uid() = user_id)', t, t);
    execute format('create policy %I_update_own on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format('create policy %I_delete_own on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;