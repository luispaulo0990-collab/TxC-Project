-- ============================================================
-- Migration: Sistema de Permissões por Cargos (Dev, Admin, Member)
-- Execute este script no SQL Editor do Supabase (projeto wlvrsjgceqpdbzbqaxqz)
--
-- Regras implementadas:
-- 1. DEV: Acesso completo (criar, alterar, importar, exportar e APAGAR obras).
--         Único perfil autorizado a excluir obras.
-- 2. ADMIN: Pode criar obras, alterar, importar e exportar.
--           NÃO pode apagar obras permanentemente.
-- 3. MEMBER (Visualizador): Apenas visualiza planejamento/avanço e exporta informações.
--           NÃO pode criar, alterar, importar dados nem apagar obras.
-- ============================================================

-- 1. Garantir coluna de role na tabela public.profiles
alter table if exists public.profiles 
add column if not exists role text not null default 'member' check (role in ('admin', 'dev', 'member'));

-- 2. Garantir constraint correta na tabela public.grupo_membros
alter table if exists public.grupo_membros 
drop constraint if exists grupo_membros_role_check;

alter table if exists public.grupo_membros 
add constraint grupo_membros_role_check check (role in ('admin', 'dev', 'member'));

-- 3. Função segura para consultar o maior nível de privilégio do usuário
create or replace function public.get_user_role(uid uuid)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_role text;
begin
  if uid is null then
    return 'member';
  end if;

  -- 1º Prioridade: Verificar se o usuário possui cargo 'dev' em algum grupo ou no perfil
  if exists (select 1 from public.grupo_membros where user_id = uid and role = 'dev') then
    return 'dev';
  end if;
  if exists (select 1 from public.profiles where id = uid and role = 'dev') then
    return 'dev';
  end if;

  -- 2º Prioridade: Verificar se o usuário é 'admin' em algum grupo ou no perfil
  if exists (select 1 from public.grupo_membros where user_id = uid and role = 'admin') then
    return 'admin';
  end if;
  if exists (select 1 from public.profiles where id = uid and role = 'admin') then
    return 'admin';
  end if;

  -- Padrão: 'member' (acesso visualizador)
  return 'member';
end;
$$;

-- 4. Habilitar RLS em profiles, grupos e tabelas operacionais
alter table if exists public.profiles enable row level security;
alter table if exists public.grupos enable row level security;
alter table if exists public.grupo_membros enable row level security;
alter table if exists public.projetos enable row level security;
alter table if exists public.atividades enable row level security;
alter table if exists public.historico_avanco enable row level security;

-- Leitura pública para perfis de usuário cadastrados
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Políticas para grupos e membros
drop policy if exists "grupos_select_all" on public.grupos;
create policy "grupos_select_all" on public.grupos for select using (true);

drop policy if exists "grupos_all" on public.grupos;
create policy "grupos_all" on public.grupos for all using (true);

drop policy if exists "grupo_membros_select_all" on public.grupo_membros;
create policy "grupo_membros_select_all" on public.grupo_membros for select using (true);

drop policy if exists "grupo_membros_all" on public.grupo_membros;
create policy "grupo_membros_all" on public.grupo_membros for all using (true);

-- ============================================================
-- RLS: public.projetos
-- ============================================================

-- Visualização (SELECT): Liberada para todos (Dev, Admin e Member)
drop policy if exists "projetos_select_all" on public.projetos;
drop policy if exists "projetos_select_own" on public.projetos;
drop policy if exists "projetos_select_own_or_grupo" on public.projetos;
drop policy if exists "projetos_select_role" on public.projetos;
create policy "projetos_select_role"
on public.projetos for select
using (true);

-- Criação (INSERT): Dev e Admin
drop policy if exists "projetos_insert_all" on public.projetos;
drop policy if exists "projetos_insert_own" on public.projetos;
drop policy if exists "projetos_insert_role" on public.projetos;
create policy "projetos_insert_role"
on public.projetos for insert
with check (
  public.get_user_role(auth.uid()) in ('dev', 'admin')
);

-- Edição (UPDATE): Dev e Admin
drop policy if exists "projetos_update_all" on public.projetos;
drop policy if exists "projetos_update_own" on public.projetos;
drop policy if exists "projetos_update_own_or_grupo" on public.projetos;
drop policy if exists "projetos_update_role" on public.projetos;
create policy "projetos_update_role"
on public.projetos for update
using (
  public.get_user_role(auth.uid()) in ('dev', 'admin')
)
with check (
  public.get_user_role(auth.uid()) in ('dev', 'admin')
);

-- Exclusão (DELETE): EXCLUSIVAMENTE DEV
drop policy if exists "projetos_delete_all" on public.projetos;
drop policy if exists "projetos_delete_own" on public.projetos;
drop policy if exists "projetos_delete_own_or_admin" on public.projetos;
drop policy if exists "projetos_delete_role" on public.projetos;
create policy "projetos_delete_role"
on public.projetos for delete
using (
  public.get_user_role(auth.uid()) = 'dev'
);

-- ============================================================
-- RLS: public.atividades
-- ============================================================

drop policy if exists "atividades_all" on public.atividades;
drop policy if exists "atividades_select_role" on public.atividades;
create policy "atividades_select_role"
on public.atividades for select
using (true);

drop policy if exists "atividades_insert_role" on public.atividades;
create policy "atividades_insert_role"
on public.atividades for insert
with check (
  public.get_user_role(auth.uid()) in ('dev', 'admin')
);

drop policy if exists "atividades_update_role" on public.atividades;
create policy "atividades_update_role"
on public.atividades for update
using (
  public.get_user_role(auth.uid()) in ('dev', 'admin')
)
with check (
  public.get_user_role(auth.uid()) in ('dev', 'admin')
);

drop policy if exists "atividades_delete_role" on public.atividades;
create policy "atividades_delete_role"
on public.atividades for delete
using (
  public.get_user_role(auth.uid()) in ('dev', 'admin')
);

-- ============================================================
-- RLS: public.historico_avanco
-- ============================================================

drop policy if exists "historico_avanco_select" on public.historico_avanco;
create policy "historico_avanco_select"
on public.historico_avanco for select
using (true);

drop policy if exists "historico_avanco_write" on public.historico_avanco;
create policy "historico_avanco_write"
on public.historico_avanco for all
using (
  public.get_user_role(auth.uid()) in ('dev', 'admin')
)
with check (
  public.get_user_role(auth.uid()) in ('dev', 'admin')
);
