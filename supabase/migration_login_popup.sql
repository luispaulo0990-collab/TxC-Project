-- ==============================================================================
-- MIGRAÇÃO: LOGIN MICROSOFT EM POP-UP (APP DENTRO DO IFRAME DO PORTAL) · TXC
-- Execute este script no SQL Editor do Supabase (projeto TxC).
-- Pode ser executado mais de uma vez com segurança.
--
-- Dentro do iframe do Portal Unità a Microsoft não abre, então o login roda num
-- pop-up. O servidor guarda aqui, por no máximo 10 minutos, o resultado do login
-- (cifrado) com o nome do "pedido" (hash do verificador que só o iframe conhece).
-- O iframe resgata uma única vez e a linha é apagada.
--
-- Acesso SOMENTE pelo servidor (service_role): RLS ligado e nenhuma política.
-- ==============================================================================

create table if not exists public.login_pedidos (
  pedido text primary key,
  resultado text not null,
  expira_em timestamptz not null
);

create index if not exists idx_login_pedidos_expira_em on public.login_pedidos(expira_em);

alter table public.login_pedidos enable row level security;
revoke all on public.login_pedidos from anon, authenticated;

notify pgrst, 'reload schema';
