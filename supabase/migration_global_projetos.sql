-- ============================================================
-- Migration: Compartilhamento Global de Obras no Supabase
-- Execute este script no SQL Editor do Supabase para que todas
-- as obras apareçam para qualquer usuário/máquina logada.
-- ============================================================

-- 1. Garantir que a tabela de projetos existe e tem as colunas corretas
create table if not exists public.projetos (
  id text primary key default gen_random_uuid()::text,
  nome text not null default 'Sem nome',
  user_id uuid references auth.users(id) on delete set null,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Habilitar Row Level Security
alter table public.projetos enable row level security;

-- 3. Remover políticas antigas que filtravam por user_id individual
drop policy if exists "projetos_select_own" on public.projetos;
drop policy if exists "projetos_insert_own" on public.projetos;
drop policy if exists "projetos_update_own" on public.projetos;
drop policy if exists "projetos_delete_own" on public.projetos;

drop policy if exists "projetos_select_all" on public.projetos;
drop policy if exists "projetos_insert_all" on public.projetos;
drop policy if exists "projetos_update_all" on public.projetos;
drop policy if exists "projetos_delete_all" on public.projetos;

-- 4. Criar novas políticas públicas/compartilhadas para usuários autenticados e anônimos autorizados

-- Permitir leitura de todas as obras
create policy "projetos_select_all"
on public.projetos
for select
using (true);

-- Permitir criação de obras
create policy "projetos_insert_all"
on public.projetos
for insert
with check (true);

-- Permitir atualização de qualquer obra
create policy "projetos_update_all"
on public.projetos
for update
using (true)
with check (true);

-- Permitir exclusão de qualquer obra
create policy "projetos_delete_all"
on public.projetos
for delete
using (true);

-- 5. Fazer o mesmo para atividades (se utilizadas)
alter table if exists public.atividades enable row level security;

drop policy if exists "atividades_select_own" on public.atividades;
drop policy if exists "atividades_insert_own" on public.atividades;
drop policy if exists "atividades_update_own" on public.atividades;
drop policy if exists "atividades_delete_own" on public.atividades;

drop policy if exists "atividades_all" on public.atividades;
create policy "atividades_all"
on public.atividades
for all
using (true)
with check (true);
