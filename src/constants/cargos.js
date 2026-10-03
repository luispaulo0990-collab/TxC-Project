// src/constants/cargos.js

export const CARGOS_PADRAO = [
  { id: "pedreiro", nome: "Pedreiro", cor: "#2563EB", categoria: "Civil" },
  { id: "servente", nome: "Servente / Ajudante", cor: "#F97316", categoria: "Apoio" },
  { id: "carpinteiro", nome: "Carpinteiro", cor: "#D97706", categoria: "Estrutura" },
  { id: "armador", nome: "Armador", cor: "#DC2626", categoria: "Estrutura" },
  { id: "eletricista", nome: "Eletricista", cor: "#9333EA", categoria: "Instalações" },
  { id: "encanador", nome: "Encanador / Bombeiro", cor: "#06B6D4", categoria: "Instalações" },
  { id: "pintor", nome: "Pintor", cor: "#10B981", categoria: "Acabamento" },
  { id: "gesseiro", nome: "Gesseiro", cor: "#64748B", categoria: "Acabamento" },
  { id: "azulejista", nome: "Azulejista / Ladrilheiro", cor: "#0D9488", categoria: "Acabamento" },
  { id: "impermeabilizador", nome: "Impermeabilizador", cor: "#4F46E5", categoria: "Proteção" },
  { id: "montador", nome: "Montador", cor: "#EA580C", categoria: "Montagem" },
  { id: "soldador", nome: "Serralheiro / Soldador", cor: "#334155", categoria: "Metalurgia" },
  { id: "mestre", nome: "Mestre de Obras", cor: "#B45309", categoria: "Supervisão" },
  { id: "encarregado", nome: "Encarregado de Obra", cor: "#7C3AED", categoria: "Supervisão" },
  { id: "operador", nome: "Operador de Máquinas", cor: "#CA8A04", categoria: "Equipamentos" },
  { id: "outro", nome: "Outro", cor: "#6B7280", categoria: "Geral" },
];

export const PALETA_CARGOS = [
  "#2563EB", // Azul
  "#F97316", // Laranja
  "#10B981", // Esmeralda
  "#D97706", // Âmbar
  "#DC2626", // Vermelho
  "#9333EA", // Roxo
  "#06B6D4", // Ciano
  "#0D9488", // Teal
  "#4F46E5", // Índigo
  "#EA580C", // Laranja Escuro
  "#64748B", // Ardósia
  "#B45309", // Castanho
  "#7C3AED", // Violeta
  "#CA8A04", // Mostarda
  "#EC4899", // Rosa
  "#84CC16", // Lima
];

/**
 * Retorna cor consistente para um cargo
 */
export const getCargoCor = (cargoNome) => {
  if (!cargoNome) return "#6B7280";
  const norm = cargoNome.trim().toLowerCase();
  const encontrado = CARGOS_PADRAO.find(
    (c) => c.nome.toLowerCase() === norm || c.id === norm || norm.includes(c.id)
  );
  if (encontrado) return encontrado.cor;

  // Hash determinístico simples para cores de cargos personalizados
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % PALETA_CARGOS.length;
  return PALETA_CARGOS[idx];
};
