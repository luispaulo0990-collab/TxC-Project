/**
 * Utilitários de Calendário da Construção Civil Brasileira
 * 
 * Regras de Produtividade:
 * - Domingos são dias improdutivos (folga semanal).
 * - Feriados nacionais oficiais (fixos e móveis) são desconsiderados.
 * - Recesso padrão: Última semana do ano (24 a 31 de dezembro) e Primeira semana (01 a 07 de janeiro) são improdutivos.
 */

// Algoritmo de Butcher / Gauss para cálculo da Páscoa (Gregoriano)
export function getPascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Março, 4 = Abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

// Retorna lista com os feriados nacionais do Brasil para um determinado ano
export function getFeriadosNacionais(ano) {
  const pascoa = getPascoa(ano);

  const add = (baseDate, dias) => {
    const r = new Date(baseDate);
    r.setDate(r.getDate() + dias);
    return r;
  };

  const carnaval = add(pascoa, -47);
  const sextaSanta = add(pascoa, -2);
  const corpusChristi = add(pascoa, 60);

  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return [
    { data: `${ano}-01-01`, nome: "Confraternização Universal (Ano Novo)" },
    { data: fmt(carnaval), nome: "Carnaval" },
    { data: fmt(sextaSanta), nome: "Sexta-feira Santa (Paixão de Cristo)" },
    { data: fmt(pascoa), nome: "Páscoa" },
    { data: `${ano}-04-21`, nome: "Tiradentes" },
    { data: `${ano}-05-01`, nome: "Dia Mundial do Trabalho" },
    { data: fmt(corpusChristi), nome: "Corpus Christi" },
    { data: `${ano}-09-07`, nome: "Independência do Brasil" },
    { data: `${ano}-10-12`, nome: "Nossa Senhora Aparecida" },
    { data: `${ano}-11-02`, nome: "Finados" },
    { data: `${ano}-11-15`, nome: "Proclamação da República" },
    { data: `${ano}-11-20`, nome: "Dia Nacional de Zumbi e Consciência Negra" },
    { data: `${ano}-12-25`, nome: "Natal" },
  ];
}

/**
 * Verifica se a data cai no recesso de fim de ano ou início de ano:
 * - Última semana do ano: 24/12 a 31/12
 * - Primeira semana do ano: 01/01 a 07/01
 */
export function isRecessoFimAno(data) {
  const d = data instanceof Date ? data : new Date(data);
  const mes = d.getMonth() + 1; // 1..12
  const dia = d.getDate();

  // 24 a 31 de Dezembro
  if (mes === 12 && dia >= 24) return true;
  // 01 a 07 de Janeiro
  if (mes === 1 && dia <= 7) return true;

  return false;
}

// Cache de feriados por ano
const feriadosCache = new Map();

export function getFeriadoMap(ano) {
  if (!feriadosCache.has(ano)) {
    const lista = getFeriadosNacionais(ano);
    const map = new Map();
    lista.forEach((f) => map.set(f.data, f.nome));
    feriadosCache.set(ano, map);
  }
  return feriadosCache.get(ano);
}

/**
 * Retorna o motivo se o dia for improdutivo, ou null se for produtivo.
 */
export function getMotivoImprodutivo(data) {
  const d = data instanceof Date ? data : new Date(data + "T00:00:00");
  const diaSemana = d.getDay(); // 0 = Domingo

  if (diaSemana === 0) {
    return "Domingo (Improdutivo)";
  }

  if (isRecessoFimAno(d)) {
    const mes = d.getMonth() + 1;
    return mes === 12 ? "Recesso de Fim de Ano" : "Recesso de Início de Ano";
  }

  const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const feriados = getFeriadoMap(d.getFullYear());
  if (feriados.has(isoDate)) {
    return feriados.get(isoDate);
  }

  return null;
}

/**
 * Retorna se o dia é produtivo (útil).
 * Domingo = falso
 * Feriado = falso
 * Recesso fim/início de ano = falso
 */
export function isDiaProdutivo(data) {
  return getMotivoImprodutivo(data) === null;
}

/**
 * Calcula a quantidade de dias produtivos entre duas datas (inclusive data inicial, exclusive data final,
 * ou total de dias úteis dentro do intervalo fechado).
 */
export function calcularDiasProdutivos(dataIni, dataFim) {
  const ini = dataIni instanceof Date ? new Date(dataIni) : new Date(dataIni + "T00:00:00");
  const fim = dataFim instanceof Date ? new Date(dataFim) : new Date(dataFim + "T00:00:00");

  if (ini > fim) return 0;

  let total = 0;
  const cur = new Date(ini);
  while (cur <= fim) {
    if (isDiaProdutivo(cur)) {
      total++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, total);
}

/**
 * Adiciona N dias produtivos a partir de uma data inicial.
 * Pula automaticamente domingos, feriados e recessos.
 */
export function adicionarDiasProdutivos(dataIni, diasProdutivos) {
  const cur = dataIni instanceof Date ? new Date(dataIni) : new Date(dataIni + "T00:00:00");
  let restantes = Math.max(1, Math.round(diasProdutivos));

  // Se o dia inicial não for produtivo, avança até o próximo dia produtivo
  while (!isDiaProdutivo(cur)) {
    cur.setDate(cur.getDate() + 1);
  }

  while (restantes > 1) {
    cur.setDate(cur.getDate() + 1);
    if (isDiaProdutivo(cur)) {
      restantes--;
    }
  }

  return cur;
}
