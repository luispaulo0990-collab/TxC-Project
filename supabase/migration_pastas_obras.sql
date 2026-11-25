-- ==============================================================================
-- MIGRAÇÃO: PASTAS DE OBRAS NA TELA INICIAL (TXC)
-- Execute este script no SQL Editor do Supabase (projeto TxC).
-- Pode ser executado mais de uma vez com segurança.
--
-- - public.pastas         : pastas criadas por Dev/Admin (ex.: por incorporador)
-- - public.projeto_pastas : em qual pasta cada obra está (sem linha = raiz)
--
-- O vínculo fica em tabela própria para NÃO alterar a linha da obra
-- (não mexe em updated_at nem conflita com o salvamento do planejamento).
-- Excluir uma pasta não exclui obras: elas voltam para a raiz.
-- ==============================================================================

create extension if not exists pgcrypto;

-- 1. Tabelas ---------------------------------------------------------------------
create table if not exists public.pastas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text,
  ordem integer not null default 0,
  criado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- projeto_id guarda o id da obra como texto (funciona com id text ou uuid em projetos)
create table if not exists public.projeto_pastas (
  projeto_id text primary key,
  pasta_id uuid not null references public.pastas(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index if not exists idx_projeto_pastas_pasta_id on public.projeto_pastas(pasta_id);

-- 2. updated_at automático (função própria, sem depender de outras migrations) -----
create or replace function public.pastas_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pastas_updated_at on public.pastas;
create trigger trg_pastas_updated_at
before update on public.pastas
for each row execute function public.pastas_set_updated_at();

-- 3. Limpeza: ao excluir uma obra, remove o vínculo dela com a pasta ---------------
create or replace function public.pastas_limpar_vinculo_obra()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.projeto_pastas where projeto_id = old.id::text;
  return old;
end;
$$;

drop trigger if exists trg_projetos_limpar_pasta on public.projetos;
create trigger trg_projetos_limpar_pasta
after delete on public.projetos
for each row execute function public.pastas_limpar_vinculo_obra();

-- 4. Cargo do usuário (cria só se ainda não existir; normalmente já existe) -------
do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_user_role'
  ) then
    execute $f$
      create function public.get_user_role(uid uuid)
      returns text
      language plpgsql
      security definer
      set search_path = public
      stable
      as $body$
      declare v_role text;
      begin
        if uid is null then return 'member'; end if;
        select role into v_role from public.profiles where id = uid;
        return coalesce(v_role, 'member');
      end;
      $body$;
    $f$;
  end if;
end;
$$;

-- 5. Permissões (RLS) --------------------------------------------------------------
alter table public.pastas enable row level security;
alter table public.projeto_pastas enable row level security;

-- Leitura: todos (inclusive visitantes, como as obras)
drop policy if exists "pastas_select_all" on public.pastas;
create policy "pastas_select_all" on public.pastas
  for select using (true);

drop policy if exists "projeto_pastas_select_all" on public.projeto_pastas;
create policy "projeto_pastas_select_all" on public.projeto_pastas
  for select using (true);

-- Escrita: apenas Dev e Admin
drop policy if exists "pastas_write_role" on public.pastas;
create policy "pastas_write_role" on public.pastas
  for all
  using (public.get_user_role(auth.uid()) in ('dev', 'admin'))
  with check (public.get_user_role(auth.uid()) in ('dev', 'admin'));

drop policy if exists "projeto_pastas_write_role" on public.projeto_pastas;
create policy "projeto_pastas_write_role" on public.projeto_pastas
  for all
  using (public.get_user_role(auth.uid()) in ('dev', 'admin'))
  with check (public.get_user_role(auth.uid()) in ('dev', 'admin'));

grant select on public.pastas, public.projeto_pastas to anon, authenticated;
grant insert, update, delete on public.pastas, public.projeto_pastas to authenticated;

-- Atualiza o cache da API para as tabelas novas aparecerem na hora
notify pgrst, 'reload schema';
