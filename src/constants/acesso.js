// src/constants/acesso.js
// Pedido de acesso feito na tela de login (ninguém cria conta sozinho).

/** Domínios aceitos no pedido de acesso (mesma lista da função solicitar_acesso no Supabase). */
export const DOMINIOS_CORPORATIVOS = ["unitaengenharia.com.br"];

/** Cargos que podem ser pedidos. Dev só é liberado pela gestão; sem login já se navega como visualizador. */
export const CARGOS_SOLICITAVEIS = [
  { id: "admin", label: "Admin", descricao: "Cria obras, altera o planejamento, importa planilhas e exporta relatórios." },
  { id: "member", label: "Visualizador (Membro)", descricao: "Acompanha o planejamento e o avanço das obras do seu grupo e exporta informações." },
];

/** Caminho que o link de convite e o "esqueci minha senha" abrem. */
export const ROTA_REDEFINIR_SENHA = "/redefinir-senha";

export const SENHA_MIN = 8;

export function dominioEmail(email) {
  return (email || "").trim().toLowerCase().split("@")[1] || "";
}

export function isEmailCorporativo(email) {
  const dominio = dominioEmail(email);
  return DOMINIOS_CORPORATIVOS.some((d) => dominio === d.toLowerCase());
}
