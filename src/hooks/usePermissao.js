// src/hooks/usePermissao.js
import { useMemo } from "react";

/**
 * Hook para verificar permissões do usuário com base em seu papel no grupo.
 *
 * Papéis:
 * - "admin": controle total
 * - "dev":   cria e edita obras, não exclui, não gerencia membros
 * - "member": apenas visualiza e exporta
 *
 * @param {string|null} role - papel do usuário: "admin" | "dev" | "member" | null
 * @returns {object} flags de permissão
 */
export function usePermissao(role) {
  return useMemo(() => {
    const isAdmin = role === "admin";
    const isDev = role === "dev";
    const isMember = role === "member" || role == null;

    return {
      /** Pode visualizar obras do grupo */
      podeVer: true,
      /** Pode criar nova obra */
      podeCriar: isAdmin || isDev,
      /** Pode editar qualquer obra do grupo */
      podeEditar: isAdmin || isDev,
      /** Pode excluir obras */
      podeExcluir: isAdmin,
      /** Pode exportar PNG/SVG */
      podeExportar: true,
      /** Pode gerenciar membros e papéis do grupo */
      podeGerenciar: isAdmin,
      /** Pode criar novos grupos */
      podeCriarGrupo: isAdmin,
      /** Papel atual */
      role: role ?? "member",
      isAdmin,
      isDev,
      isMember,
      /** Label de exibição do papel */
      roleLabel: isAdmin ? "Admin" : isDev ? "Dev" : "Membro",
    };
  }, [role]);
}
