-- ============================================================
-- Migration: Biblioteca Global de Macrofluxos no Supabase
-- Permite que templates/modelos de macrofluxos sejam salvos
-- na nuvem e reutilizados em qualquer obra/projeto da construtora.
-- ============================================================

-- 1. Criar tabela de macrofluxos
create table if not exists public.macrofluxos (
  id text primary key default gen_random_uuid()::text,
  nome text not null default 'Novo Macrofluxo',
  descricao text default '',
  atividades_padrao jsonb not null default '[]'::jsonb,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Índices de busca
create index if not exists idx_macrofluxos_user_id on public.macrofluxos(user_id);
create index if not exists idx_macrofluxos_updated_at on public.macrofluxos(updated_at desc);

-- 3. Habilitar RLS
alter table public.macrofluxos enable row level security;

-- 4. Limpar políticas antigas se existirem
drop policy if exists "macrofluxos_select_all" on public.macrofluxos;
drop policy if exists "macrofluxos_insert_all" on public.macrofluxos;
drop policy if exists "macrofluxos_update_all" on public.macrofluxos;
drop policy if exists "macrofluxos_delete_all" on public.macrofluxos;

-- 5. Criar políticas globais para compartilhamento entre toda a equipe
create policy "macrofluxos_select_all"
on public.macrofluxos
for select
using (true);

create policy "macrofluxos_insert_all"
on public.macrofluxos
for insert
with check (true);

create policy "macrofluxos_update_all"
on public.macrofluxos
for update
using (true)
with check (true);

create policy "macrofluxos_delete_all"
on public.macrofluxos
for delete
using (true);

-- 6. Trigger para atualizar automatically o campo updated_at
create or replace function public.handle_macrofluxos_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_macrofluxos_updated_at on public.macrofluxos;
create trigger trigger_macrofluxos_updated_at
before update on public.macrofluxos
for each row
execute function public.handle_macrofluxos_updated_at();
