// src/hooks/usePermissao.js

/**
 * Função utilitária para obter permissões do usuário logado.
 * Permissões completas liberadas para criação, edição e exclusão de obras.
 *
 * @param {string|null} role - papel do usuário: "admin" | "dev" | "member" | null
 * @returns {object} flags de permissão
 */
export function calcularPermissao(role) {
  const rawRole = (role || "member").toString().toLowerCase().trim();
  const isDev = rawRole === "dev";
  const isAdmin = rawRole === "admin";
  const isMember = rawRole === "member" || (!isDev && !isAdmin);
  const normalizedRole = isDev ? "dev" : isAdmin ? "admin" : "member";

  return {
    /** Pode visualizar planejamento, linha de balanço e avanços */
    podeVer: true,
    /** Pode criar nova obra: apenas Dev e Admin */
    podeCriar: isDev || isAdmin,
    /** Pode editar obras e planejar atividades: apenas Dev e Admin */
    podeEditar: isDev || isAdmin,
    /** Pode importar dados de planilhas (Excel, CSV, replanejamento): apenas Dev e Admin */
    podeImportar: isDev || isAdmin,
    /** Pode excluir obras permanentemente: EXCLUSIVAMENTE Dev */
    podeExcluir: isDev,
    /** Pode exportar informações (PNG, SVG, Excel, etc.): Dev, Admin e Membro */
    podeExportar: true,
    /** Pode gerenciar membros e papéis dos grupos: Dev e Admin */
    podeGerenciar: isDev || isAdmin,
    /** Pode criar novos grupos */
    podeCriarGrupo: isDev || isAdmin,
    /** Aba de Avanço Físico no menu: visível exclusivamente para perfil Dev (ocultada para Admin e Membro) */
    podeVerAbaAvanco: isDev,
    /** Papel normalizado */
    role: normalizedRole,
    isAdmin,
    isDev,
    isMember,
    /** Label de exibição amigável */
    roleLabel: isDev ? "Dev" : isAdmin ? "Admin" : "Visualizador (Membro)",
  };
}

/**
 * Hook/função compatível com usePermissao
 */
export function usePermissao(role) {
  return calcularPermissao(role);
}

