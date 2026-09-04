-- ============================================================
-- Migration: Sistema de Grupos e Permissões
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela de grupos
create table if not exists public.grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 2. Tabela de membros de grupo (vincula usuário ↔ grupo + papel)
create table if not exists public.grupo_membros (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'dev', 'member')),
  created_at timestamptz not null default now(),
  unique(grupo_id, user_id)
);

-- 3. Adicionar coluna grupo_id em projetos (se não existir)
alter table public.projetos add column if not exists grupo_id uuid references public.grupos(id) on delete set null;

-- 4. Índices para performance
create index if not exists idx_grupo_membros_user_id on public.grupo_membros(user_id);
create index if not exists idx_grupo_membros_grupo_id on public.grupo_membros(grupo_id);
create index if not exists idx_projetos_grupo_id on public.projetos(grupo_id);

-- 5. Triggers de updated_at para grupos
drop trigger if exists trg_grupos_updated_at on public.grupos;

-- 6. Habilitar RLS nas novas tabelas
alter table public.grupos enable row level security;
alter table public.grupo_membros enable row level security;

-- ============================================================
-- RLS: grupos
-- ============================================================

-- Qualquer membro pode ver os grupos dos quais participa
drop policy if exists "grupos_select_membro" on public.grupos;
create policy "grupos_select_membro"
on public.grupos for select
using (
  id in (
    select grupo_id from public.grupo_membros where user_id = auth.uid()
  )
);

-- Qualquer usuário autenticado pode criar um grupo
drop policy if exists "grupos_insert_auth" on public.grupos;
create policy "grupos_insert_auth"
on public.grupos for insert
with check (auth.uid() is not null);

-- Apenas admin do grupo pode atualizar o grupo
drop policy if exists "grupos_update_admin" on public.grupos;
create policy "grupos_update_admin"
on public.grupos for update
using (
  id in (
    select grupo_id from public.grupo_membros
    where user_id = auth.uid() and role = 'admin'
  )
);

-- Apenas o criador ou admin pode deletar o grupo
drop policy if exists "grupos_delete_admin" on public.grupos;
create policy "grupos_delete_admin"
on public.grupos for delete
using (
  criado_por = auth.uid()
  or id in (
    select grupo_id from public.grupo_membros
    where user_id = auth.uid() and role = 'admin'
  )
);

-- ============================================================
-- RLS: grupo_membros
-- ============================================================

-- Membros veem outros membros dos mesmos grupos
drop policy if exists "grupo_membros_select_membro" on public.grupo_membros;
create policy "grupo_membros_select_membro"
on public.grupo_membros for select
using (
  grupo_id in (
    select grupo_id from public.grupo_membros where user_id = auth.uid()
  )
);

-- Apenas admin do grupo pode adicionar membros
drop policy if exists "grupo_membros_insert_admin" on public.grupo_membros;
create policy "grupo_membros_insert_admin"
on public.grupo_membros for insert
with check (
  grupo_id in (
    select grupo_id from public.grupo_membros
    where user_id = auth.uid() and role = 'admin'
  )
  -- Admin recém-criou o grupo (inserindo a si mesmo como primeiro membro)
  or auth.uid() = user_id
);

-- Apenas admin pode alterar papéis
drop policy if exists "grupo_membros_update_admin" on public.grupo_membros;
create policy "grupo_membros_update_admin"
on public.grupo_membros for update
using (
  grupo_id in (
    select grupo_id from public.grupo_membros
    where user_id = auth.uid() and role = 'admin'
  )
);

-- Admin pode remover membros; usuário pode sair do próprio grupo
drop policy if exists "grupo_membros_delete_admin" on public.grupo_membros;
create policy "grupo_membros_delete_admin"
on public.grupo_membros for delete
using (
  user_id = auth.uid()
  or grupo_id in (
    select grupo_id from public.grupo_membros
    where user_id = auth.uid() and role = 'admin'
  )
);

-- ============================================================
-- RLS: projetos — atualizar para incluir visibilidade de grupo
-- ============================================================

-- Remover política antiga de select somente próprio
drop policy if exists "projetos_select_own" on public.projetos;

-- Nova política: ver obras próprias OU obras do grupo
create policy "projetos_select_own_or_grupo"
on public.projetos for select
using (
  auth.uid() = user_id
  or (
    grupo_id is not null
    and grupo_id in (
      select grupo_id from public.grupo_membros where user_id = auth.uid()
    )
  )
);

-- Atualizar insert: admins e devs podem criar (verificado no app, permissivo aqui)
drop policy if exists "projetos_insert_own" on public.projetos;
create policy "projetos_insert_own"
on public.projetos for insert
with check (auth.uid() = user_id);

-- Atualizar update: dono ou admin/dev do mesmo grupo
drop policy if exists "projetos_update_own" on public.projetos;
create policy "projetos_update_own_or_grupo"
on public.projetos for update
using (
  auth.uid() = user_id
  or (
    grupo_id is not null
    and grupo_id in (
      select grupo_id from public.grupo_membros
      where user_id = auth.uid() and role in ('admin', 'dev')
    )
  )
);

-- Atualizar delete: dono ou admin do mesmo grupo
drop policy if exists "projetos_delete_own" on public.projetos;
create policy "projetos_delete_own_or_admin"
on public.projetos for delete
using (
  auth.uid() = user_id
  or (
    grupo_id is not null
    and grupo_id in (
      select grupo_id from public.grupo_membros
      where user_id = auth.uid() and role = 'admin'
    )
  )
);
