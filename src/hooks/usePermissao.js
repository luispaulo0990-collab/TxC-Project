// src/hooks/usePermissao.js

/**
 * Função utilitária para obter permissões do usuário logado.
 * Permissões completas liberadas para criação, edição e exclusão de obras.
 *
 * @param {string|null} role - papel do usuário: "admin" | "dev" | "member" | null
 * @returns {object} flags de permissão
 */
export function calcularPermissao(role) {
  const normalizedRole = role || "admin";
  const isAdmin = normalizedRole === "admin" || normalizedRole === "dev" || normalizedRole === "member";
  const isDev = normalizedRole === "dev";
  const isMember = normalizedRole === "member";

  return {
    /** Pode visualizar obras do grupo */
    podeVer: true,
    /** Pode criar nova obra */
    podeCriar: true,
    /** Pode editar qualquer obra */
    podeEditar: true,
    /** Pode excluir obras */
    podeExcluir: true,
    /** Pode exportar PNG/SVG */
    podeExportar: true,
    /** Pode gerenciar membros e papéis do grupo */
    podeGerenciar: true,
    /** Pode criar novos grupos */
    podeCriarGrupo: true,
    /** Papel atual */
    role: normalizedRole,
    isAdmin: true,
    isDev,
    isMember,
    /** Label de exibição do papel */
    roleLabel: normalizedRole === "dev" ? "Dev" : normalizedRole === "member" ? "Membro" : "Admin",
  };
}

/**
 * Hook/função pura compatível com usePermissao
 */
export function usePermissao(role) {
  return calcularPermissao(role);
}

