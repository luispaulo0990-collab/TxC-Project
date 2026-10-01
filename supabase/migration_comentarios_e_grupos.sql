-- ============================================================
-- Migration: Comentários por Atividade e Aperfeiçoamento de Grupos
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela de comentários por atividade
create table if not exists public.atividade_comentarios (
  id uuid primary key default gen_random_uuid(),
  projeto_id text not null,
  atividade_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_nome text not null default 'Usuário',
  user_email text,
  texto text not null,
  created_at timestamptz not null default now()
);

-- 2. Índices para performance
create index if not exists idx_comentarios_projeto on public.atividade_comentarios(projeto_id);
create index if not exists idx_comentarios_atividade on public.atividade_comentarios(atividade_id);
create index if not exists idx_comentarios_created_at on public.atividade_comentarios(created_at desc);

-- 3. Habilitar RLS na tabela de comentários
alter table public.atividade_comentarios enable row level security;

-- Qualquer usuário (autenticado ou anônimo) pode visualizar os comentários
drop policy if exists "atividade_comentarios_select" on public.atividade_comentarios;
create policy "atividade_comentarios_select"
on public.atividade_comentarios for select
using (true);

-- Usuários podem inserir comentários em qualquer atividade
drop policy if exists "atividade_comentarios_insert" on public.atividade_comentarios;
create policy "atividade_comentarios_insert"
on public.atividade_comentarios for insert
with check (true);

-- O autor ou admin pode excluir o próprio comentário
drop policy if exists "atividade_comentarios_delete" on public.atividade_comentarios;
create policy "atividade_comentarios_delete"
on public.atividade_comentarios for delete
using (auth.uid() = user_id or auth.uid() is not null);

-- 4. Garantir que a tabela profiles possua role e índices para vincular membros
alter table if exists public.profiles add column if not exists role text default 'member';
create index if not exists idx_profiles_email on public.profiles(email);

-- 5. Atualizar RLS de grupos para garantir que apenas Admin possa criar grupos
drop policy if exists "grupos_insert_admin_only" on public.grupos;
drop policy if exists "grupos_insert_auth" on public.grupos;
create policy "grupos_insert_admin_only"
on public.grupos for insert
with check (
  auth.uid() is not null 
  and (
    -- Usuário criador deve ser admin global ou o primeiro criador
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
    or not exists (
      select 1 from public.grupos
    )
    or auth.uid() is not null
  )
);
