-- ============================================================
-- Migration de Correção: Eliminação de Recursão RLS e Isolamento de Usuários
-- Execute este script no SQL Editor do Supabase (wlvrsjgceqpdbzbqaxqz)
-- ============================================================

-- 1. Função SECURITY DEFINER que impede a recursão infinita (erro 42P17)
create or replace function public.get_user_grupo_ids(uid uuid)
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select grupo_id from public.grupo_membros where user_id = uid;
$$;

-- 2. Habilitar RLS em todas as tabelas
alter table if exists public.grupos enable row level security;
alter table if exists public.grupo_membros enable row level security;
alter table if exists public.projetos enable row level security;
alter table if exists public.atividades enable row level security;

-- ============================================================
-- RLS: grupo_membros
-- ============================================================
drop policy if exists "grupo_membros_select_membro" on public.grupo_membros;
drop policy if exists "grupo_membros_select" on public.grupo_membros;
create policy "grupo_membros_select"
on public.grupo_membros for select
using (
  user_id = auth.uid()
  or grupo_id in (select public.get_user_grupo_ids(auth.uid()))
);

drop policy if exists "grupo_membros_insert_admin" on public.grupo_membros;
create policy "grupo_membros_insert_admin"
on public.grupo_membros for insert
with check (
  auth.uid() = user_id
  or grupo_id in (select public.get_user_grupo_ids(auth.uid()))
);

drop policy if exists "grupo_membros_update_admin" on public.grupo_membros;
create policy "grupo_membros_update_admin"
on public.grupo_membros for update
using (
  grupo_id in (select public.get_user_grupo_ids(auth.uid()))
);

drop policy if exists "grupo_membros_delete_admin" on public.grupo_membros;
create policy "grupo_membros_delete_admin"
on public.grupo_membros for delete
using (
  user_id = auth.uid()
  or grupo_id in (select public.get_user_grupo_ids(auth.uid()))
);

-- ============================================================
-- RLS: grupos
-- ============================================================
drop policy if exists "grupos_select_membro" on public.grupos;
drop policy if exists "grupos_select" on public.grupos;
create policy "grupos_select"
on public.grupos for select
using (
  criado_por = auth.uid()
  or id in (select public.get_user_grupo_ids(auth.uid()))
);

drop policy if exists "grupos_insert_auth" on public.grupos;
create policy "grupos_insert_auth"
on public.grupos for insert
with check (auth.uid() is not null);

drop policy if exists "grupos_update_admin" on public.grupos;
create policy "grupos_update_admin"
on public.grupos for update
using (
  criado_por = auth.uid()
  or id in (select public.get_user_grupo_ids(auth.uid()))
);

drop policy if exists "grupos_delete_admin" on public.grupos;
create policy "grupos_delete_admin"
on public.grupos for delete
using (
  criado_por = auth.uid()
  or id in (select public.get_user_grupo_ids(auth.uid()))
);

-- ============================================================
-- RLS: projetos
-- ============================================================
drop policy if exists "projetos_select_all" on public.projetos;
drop policy if exists "projetos_select_own" on public.projetos;
drop policy if exists "projetos_select_own_or_grupo" on public.projetos;
create policy "projetos_select_own_or_grupo"
on public.projetos for select
using (
  auth.uid() = user_id
  or (
    grupo_id is not null
    and grupo_id in (select public.get_user_grupo_ids(auth.uid()))
  )
);

drop policy if exists "projetos_insert_all" on public.projetos;
drop policy if exists "projetos_insert_own" on public.projetos;
create policy "projetos_insert_own"
on public.projetos for insert
with check (
  auth.uid() = user_id
  or (
    grupo_id is not null
    and grupo_id in (select public.get_user_grupo_ids(auth.uid()))
  )
);

drop policy if exists "projetos_update_all" on public.projetos;
drop policy if exists "projetos_update_own" on public.projetos;
drop policy if exists "projetos_update_own_or_grupo" on public.projetos;
create policy "projetos_update_own_or_grupo"
on public.projetos for update
using (
  auth.uid() = user_id
  or (
    grupo_id is not null
    and grupo_id in (select public.get_user_grupo_ids(auth.uid()))
  )
);

drop policy if exists "projetos_delete_all" on public.projetos;
drop policy if exists "projetos_delete_own" on public.projetos;
drop policy if exists "projetos_delete_own_or_admin" on public.projetos;
create policy "projetos_delete_own_or_admin"
on public.projetos for delete
using (
  auth.uid() = user_id
  or (
    grupo_id is not null
    and grupo_id in (select public.get_user_grupo_ids(auth.uid()))
  )
);
