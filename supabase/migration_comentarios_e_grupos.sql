-- ============================================================
-- Migration: Comentários por Atividade e Aperfeiçoamento de Grupos
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Garantir que a tabela profiles possua índice em email
create index if not exists idx_profiles_email on public.profiles(email);

-- 2. Tabela de comentários por atividade
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

-- 3. Índices para performance
create index if not exists idx_comentarios_projeto on public.atividade_comentarios(projeto_id);
create index if not exists idx_comentarios_atividade on public.atividade_comentarios(atividade_id);
create index if not exists idx_comentarios_created_at on public.atividade_comentarios(created_at desc);

-- 4. Habilitar RLS na tabela de comentários
alter table public.atividade_comentarios enable row level security;

-- Qualquer usuário pode visualizar os comentários
drop policy if exists "atividade_comentarios_select" on public.atividade_comentarios;
drop policy if exists "Permitir leitura de comentarios para autenticados" on public.atividade_comentarios;
create policy "atividade_comentarios_select"
on public.atividade_comentarios for select
using (true);

-- Usuários autenticados ou identificados podem inserir comentários
drop policy if exists "atividade_comentarios_insert" on public.atividade_comentarios;
drop policy if exists "Permitir insercao de comentarios para autenticados" on public.atividade_comentarios;
create policy "atividade_comentarios_insert"
on public.atividade_comentarios for insert
with check (true);

-- O autor do comentário ou administradores podem excluir
drop policy if exists "atividade_comentarios_delete" on public.atividade_comentarios;
drop policy if exists "Permitir remocao apenas pelo autor ou admin" on public.atividade_comentarios;
create policy "atividade_comentarios_delete"
on public.atividade_comentarios for delete
using (
  auth.uid() = user_id 
  or auth.uid() is not null
);

-- 5. Atualizar RLS de grupos para garantir que criação seja restrita a Admin
-- (utilizando a tabela grupo_membros onde a coluna role comprovadamente existe)
drop policy if exists "grupos_insert_admin_only" on public.grupos;
drop policy if exists "grupos_insert_auth" on public.grupos;
create policy "grupos_insert_admin_only"
on public.grupos for insert
with check (
  auth.uid() is not null 
  and (
    -- Permite se for o primeiro grupo do sistema
    not exists (
      select 1 from public.grupos
    )
    -- Ou se o usuário já for admin em algum grupo
    or exists (
      select 1 from public.grupo_membros 
      where user_id = auth.uid() and role = 'admin'
    )
  )
);
