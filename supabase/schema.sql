create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projetos (
  id text primary key default gen_random_uuid()::text,
  nome text not null default 'Sem nome',
  user_id uuid references auth.users(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.atividades (
  id text primary key default gen_random_uuid()::text,
  projeto_id text references public.projetos(id) on delete cascade,
  nome text not null default 'Nova atividade',
  user_id uuid references auth.users(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projetos_updated_at on public.projetos;
create trigger trg_projetos_updated_at
before update on public.projetos
for each row
execute function public.set_updated_at();

drop trigger if exists trg_atividades_updated_at on public.atividades;
create trigger trg_atividades_updated_at
before update on public.atividades
for each row
execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.projetos enable row level security;
alter table public.atividades enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "projetos_select_own"
on public.projetos
for select
using (auth.uid() = user_id);

create policy "projetos_insert_own"
on public.projetos
for insert
with check (auth.uid() = user_id);

create policy "projetos_update_own"
on public.projetos
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "projetos_delete_own"
on public.projetos
for delete
using (auth.uid() = user_id);

create policy "atividades_select_own"
on public.atividades
for select
using (auth.uid() = user_id);

create policy "atividades_insert_own"
on public.atividades
for insert
with check (auth.uid() = user_id);

create policy "atividades_update_own"
on public.atividades
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "atividades_delete_own"
on public.atividades
for delete
using (auth.uid() = user_id);

create index if not exists idx_projetos_user_id on public.projetos(user_id);
create index if not exists idx_atividades_user_id on public.atividades(user_id);
create index if not exists idx_atividades_projeto_id on public.atividades(projeto_id);
