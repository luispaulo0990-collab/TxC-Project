-- ==============================================================================
-- MIGRAÇÃO: ARQUIVAMENTO E EXCLUSÃO TOTAL DE OBRAS (TXC)
-- Execute este script no SQL Editor do Supabase se desejar sincronizar
-- as novas colunas e garantir exclusão cascateada total de obras.
-- ==============================================================================

-- 1. Garantir coluna de arquivamento na tabela public.projetos
alter table public.projetos add column if not exists arquivado boolean not null default false;
alter table public.projetos add column if not exists arquivado_em timestamptz;
alter table public.projetos add column if not exists arquivado_por text;

create index if not exists idx_projetos_arquivado on public.projetos(arquivado);

-- 2. Função de segurança com SECURITY DEFINER para exclusão total e cascateada
-- Apenas usuários com role 'dev' podem executar a exclusão
create or replace function public.excluir_obra_definitiva(p_projeto_id text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text;
begin
  -- Verificar se o usuário autenticado é DEV
  v_role := public.get_user_role(auth.uid());
  if v_role <> 'dev' then
    raise exception 'Acesso negado: apenas desenvolvedores (Dev) podem excluir obras definitivamente.';
  end if;

  -- 1. Excluir comentários da obra
  delete from public.atividade_comentarios where projeto_id = p_projeto_id;

  -- 2. Excluir histórico de avanço da obra
  delete from public.historico_avanco where projeto_id = p_projeto_id;

  -- 3. Excluir atividades da obra
  delete from public.atividades where projeto_id = p_projeto_id;

  -- 4. Excluir a obra da tabela projetos
  delete from public.projetos where id = p_projeto_id;

  return true;
end;
$$;

-- Permissão de execução para usuários autenticados (a função valida se é 'dev' internamente)
grant execute on function public.excluir_obra_definitiva(text) to authenticated;
