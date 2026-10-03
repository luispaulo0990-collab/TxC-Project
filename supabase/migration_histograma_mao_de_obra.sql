-- ============================================================
-- Migration: Histórico de Avanço Físico e Histograma de Mão de Obra
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Criação da tabela de histórico de avanços com mão de obra
create table if not exists public.historico_avanco (
  id text primary key default gen_random_uuid()::text,
  projeto_id text not null,
  projeto_nome text,
  obra_nome text,
  atividade_id text not null,
  atividade_nome text not null,
  torre_id text,
  torre_nome text,
  data date not null default current_date,
  avanco_anterior numeric default 0,
  avanco_novo numeric default 0,
  percentual_avancado numeric default 0,
  pavimento_id text,
  pavimento_nome text,
  homens_total integer not null default 1,
  cargos jsonb not null default '[]'::jsonb,
  observacao text default '',
  user_id uuid references auth.users(id) on delete set null,
  user_nome text default 'Usuário',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Índices de alta performance para filtros por obra, torre e linha do tempo
create index if not exists idx_hist_avanco_projeto on public.historico_avanco(projeto_id);
create index if not exists idx_hist_avanco_atividade on public.historico_avanco(atividade_id);
create index if not exists idx_hist_avanco_torre on public.historico_avanco(torre_id);
create index if not exists idx_hist_avanco_data on public.historico_avanco(data desc);

-- 3. Trigger para updated_at automático
drop trigger if exists trg_historico_avanco_updated_at on public.historico_avanco;
create trigger trg_historico_avanco_updated_at
before update on public.historico_avanco
for each row
execute function public.set_updated_at();

-- 4. Habilitação de RLS e políticas de acesso
alter table public.historico_avanco enable row level security;

drop policy if exists "hist_avanco_select_all" on public.historico_avanco;
drop policy if exists "hist_avanco_insert_all" on public.historico_avanco;
drop policy if exists "hist_avanco_update_all" on public.historico_avanco;
drop policy if exists "hist_avanco_delete_all" on public.historico_avanco;

create policy "hist_avanco_select_all"
on public.historico_avanco for select
using (true);

create policy "hist_avanco_insert_all"
on public.historico_avanco for insert
with check (true);

create policy "hist_avanco_update_all"
on public.historico_avanco for update
using (true)
with check (true);

create policy "hist_avanco_delete_all"
on public.historico_avanco for delete
using (true);

-- 5. Backfill: caso existam avanços gravados no JSON de projetos, extrair para a tabela
do $$
begin
  insert into public.historico_avanco (
    id,
    projeto_id,
    projeto_nome,
    obra_nome,
    atividade_id,
    atividade_nome,
    torre_id,
    torre_nome,
    data,
    avanco_anterior,
    avanco_novo,
    percentual_avancado,
    pavimento_id,
    pavimento_nome,
    homens_total,
    cargos,
    observacao,
    user_id,
    user_nome,
    created_at
  )
  select
    coalesce(item->>'id', gen_random_uuid()::text) as id,
    p.id as projeto_id,
    p.nome as projeto_nome,
    p.nome as obra_nome,
    ativ->>'id' as atividade_id,
    coalesce(ativ->>'nome', 'Atividade') as atividade_nome,
    ativ->>'torreId' as torre_id,
    coalesce(
      (
        select t->>'nome'
        from jsonb_array_elements(coalesce(p.dados->'torres', '[]'::jsonb)) t
        where t->>'id' = ativ->>'torreId'
        limit 1
      ),
      ''
    ) as torre_nome,
    coalesce((item->>'data')::date, current_date) as data,
    coalesce((item->>'avancoAnterior')::numeric, 0) as avanco_anterior,
    coalesce((item->>'avancoNovo')::numeric, 0) as avanco_novo,
    coalesce((item->>'deltaAvanco')::numeric, 0) as percentual_avancado,
    item->>'pavimentoId' as pavimento_id,
    item->>'pavimentoNome' as pavimento_nome,
    coalesce((item->>'homensTotal')::integer, 1) as homens_total,
    coalesce(item->'cargos', '[]'::jsonb) as cargos,
    coalesce(item->>'observacao', '') as observacao,
    p.user_id,
    coalesce(item->>'userNome', 'Usuário') as user_nome,
    now() as created_at
  from public.projetos p,
       jsonb_array_elements(coalesce(p.dados->'atividades', '[]'::jsonb)) ativ,
       jsonb_array_elements(coalesce(ativ->'historicoAvanco', '[]'::jsonb)) item
  on conflict (id) do nothing;
exception when others then
  raise notice 'Tabela populada ou sem dados legados de historicoAvanco.';
end;
$$;
