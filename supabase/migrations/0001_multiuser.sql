-- ============================================================================
-- Multi-user migration
-- Setiap baris di notes/folders/stem_* dimiliki tepat satu user.
-- RLS memaksa akses hanya oleh auth.uid() = user_id.
-- ============================================================================

-- 1) Tambah kolom user_id ke tabel existing
alter table public.notes   add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.folders add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2) Hapus data lama yang tidak punya owner (dev cleanup — data single-user sebelumnya)
delete from public.notes   where user_id is null;
delete from public.folders where user_id is null;

-- 3) Sekarang jadikan NOT NULL
alter table public.notes   alter column user_id set not null;
alter table public.folders alter column user_id set not null;

-- 4) Index untuk performa query per-user
create index if not exists notes_user_id_idx        on public.notes(user_id);
create index if not exists notes_user_updated_idx   on public.notes(user_id, updated_at desc);
create index if not exists folders_user_id_idx      on public.folders(user_id);

-- 5) Tabel histori STEM Studio
create table if not exists public.stem_analyses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  subject    text not null,
  topic      text,
  title      text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists stem_analyses_user_idx on public.stem_analyses(user_id, created_at desc);

create table if not exists public.stem_cheatsheets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  subject    text not null,
  topic      text,
  title      text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists stem_cheatsheets_user_idx on public.stem_cheatsheets(user_id, created_at desc);

create table if not exists public.stem_quiz_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  subject         text not null,
  difficulty      text not null,
  mode            text not null,          -- 'relaxed' | 'exam'
  topic           text,
  questions       jsonb not null,
  answers         jsonb not null,
  score           integer not null,
  total           integer not null,
  elapsed_seconds integer not null,
  created_at      timestamptz not null default now()
);
create index if not exists stem_quiz_attempts_user_idx on public.stem_quiz_attempts(user_id, created_at desc);

-- 6) Aktifkan RLS
alter table public.notes                enable row level security;
alter table public.folders              enable row level security;
alter table public.stem_analyses        enable row level security;
alter table public.stem_cheatsheets     enable row level security;
alter table public.stem_quiz_attempts   enable row level security;

-- 7) Policy — pola sama untuk semua tabel
-- (drop-if-exists supaya aman di-rerun)
do $$
declare t text;
begin
  foreach t in array array['notes','folders','stem_analyses','stem_cheatsheets','stem_quiz_attempts']
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