/**
 * Utilitários de Calendário da Construção Civil Brasileira
 * 
 * Regras de Produtividade e Calendário TxC:
 * - Finais de semana (Sábados e Domingos) são impossibilitados de planejamento e dias improdutivos.
 * - Meses por padrão possuem somente 4 semanas de 5 dias úteis de trabalho (20 dias úteis/mês).
 * - Feriados nacionais oficiais (fixos e móveis) são desconsiderados na contagem produtiva.
 * - Janeiro e Dezembro: ambos possuem somente 2 semanas úteis em cada mês (10 dias úteis):
 *   - Dezembro: Primeiras 2 semanas úteis (dias 01 a 14); a partir do dia 15 é recesso.
 *   - Janeiro: Primeiras 2 semanas de recesso (dias 01 a 14); a partir do dia 15 são as 2 semanas úteis.
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
 * - Dezembro: somente 2 semanas úteis (a partir do dia 15 até 31 é recesso)
 * - Janeiro: somente 2 semanas úteis (dias 01 a 14 são recesso)
 */
export function isRecessoFimAno(data) {
  const d = data instanceof Date ? data : new Date(typeof data === "string" && !data.includes("T") ? data + "T00:00:00" : data);
  if (isNaN(d.getTime())) return false;
  const mes = d.getMonth() + 1; // 1..12
  const dia = d.getDate();

  // Dezembro: a partir do dia 15 é recesso (deixando apenas 2 semanas de trabalho)
  if (mes === 12 && dia >= 15) return true;
  // Janeiro: dias 01 a 14 são recesso (deixando apenas 2 semanas de trabalho)
  if (mes === 1 && dia <= 14) return true;

  return false;
}

/**
 * Verifica se a data é fim de semana (Sábado ou Domingo)
 */
export function isFimDeSemana(data) {
  if (!data) return false;
  const d = data instanceof Date ? data : new Date(typeof data === "string" && !data.includes("T") ? data + "T00:00:00" : data);
  if (isNaN(d.getTime())) return false;
  const diaSemana = d.getDay();
  return diaSemana === 0 || diaSemana === 6;
}

/**
 * Se a data cair em um final de semana (sábado ou domingo),
 * joga automaticamente para a próxima segunda-feira pós esse final de semana:
 * - Sábado (+2 dias) -> Segunda-feira
 * - Domingo (+1 dia) -> Segunda-feira
 */
export function ajustarFimDeSemanaParaSegunda(data) {
  if (!data) return data;
  let d;
  const isString = typeof data === "string";
  if (data instanceof Date) {
    d = new Date(data.getTime());
  } else if (isString) {
    d = new Date(data.includes("T") ? data : data + "T00:00:00");
  } else {
    d = new Date(data);
  }

  if (isNaN(d.getTime())) return data;

  const diaSemana = d.getDay();
  if (diaSemana === 6) {
    // Sábado -> joga para próxima Segunda (+2 dias)
    d.setDate(d.getDate() + 2);
  } else if (diaSemana === 0) {
    // Domingo -> joga para próxima Segunda (+1 dia)
    d.setDate(d.getDate() + 1);
  }

  if (isString && !data.includes("T")) {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  return d;
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
 * Finais de semana (Sábado e Domingo), recessos e feriados são improdutivos.
 */
export function getMotivoImprodutivo(data) {
  const d = data instanceof Date ? data : new Date(typeof data === "string" && !data.includes("T") ? data + "T00:00:00" : data);
  if (isNaN(d.getTime())) return null;
  const diaSemana = d.getDay(); // 0 = Domingo, 6 = Sábado

  if (diaSemana === 0) {
    return "Domingo (Fim de Semana)";
  }
  if (diaSemana === 6) {
    return "Sábado (Fim de Semana)";
  }

  if (isRecessoFimAno(d)) {
    const mes = d.getMonth() + 1;
    return mes === 12 ? "Recesso de Fim de Ano (Dezembro)" : "Recesso de Início de Ano (Janeiro)";
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
