// src/utils/statusUtils.js
import { D, diffDays, fmtBR, hoje, iso } from "./dateUtils";

/**
 * Calcula o status de avanço de uma atividade com base no corte da data de referência (linha de corte de hoje).
 * Critério do usuário:
 * A linha de corte da data de hoje corta as linhas das atividades no gráfico Linha de Balanço.
 * Uma atividade é considerada EM ATRASO (ATRASADA) se o avanço realizado (em pavimentos ou %)
 * for MENOR do que o momento/pavimento onde a linha Hoje corta a atividade planejada.
 *
 * Exemplo prático:
 * A estrutura está avançada até o 2º pav, porém a data de hoje corta a linha da estrutura no 6º pav;
 * portanto a atividade se encontra em atraso (2 pavs realizados < 6 pavs cortados por Hoje).
 */
export function calcularStatusAtividade(atividade, proj, rowIdx = {}, dataCorte = null) {
  if (!atividade || !proj) {
    return {
      status: "NAO_INICIADA",
      avanco: 0,
      pavsConcluidos: 0,
      pavsPrevistosCorte: 0,
      pctPrevistoCorte: 0,
      diferencaPavs: 0,
      diferencaPct: 0,
      pavCorteNome: null,
      pavAtualNome: null,
      totalPavs: 1,
      duracaoPlan: 1,
      fracTempoCorte: 0,
      emAtraso: false,
      corteHojeAtivo: false,
    };
  }

  const refData = dataCorte ? D(dataCorte) : hoje();
  const di = D(atividade.dataIni);
  const df = D(atividade.dataFim);
  const duracaoPlan = Math.max(1, diffDays(di, df));

  // Locais da torre ordenados pela ordem definida na obra
  const locaisTorre = (proj.locais || [])
    .filter((l) => l.torreId === atividade.torreId)
    .sort((x, y) => (x.ordem ?? 0) - (y.ordem ?? 0));

  const tIni = locaisTorre.findIndex((l) => l.id === atividade.locIniId);
  const tFim = locaisTorre.findIndex((l) => l.id === atividade.locFimId);

  // Fallback para índices globais se locais da torre não estiverem indexados
  const iIdx = tIni >= 0 ? tIni : (rowIdx[atividade.locIniId] ?? 0);
  const fIdx = tFim >= 0 ? tFim : (rowIdx[atividade.locFimId] ?? 0);
  const totalPavs = Math.max(1, Math.abs(fIdx - iIdx) + 1);

  // Percentual de avanço realizado (0 a 100)
  let avanco = atividade.avanco != null ? Number(atividade.avanco) : 0;
  if (atividade.realFim && avanco === 0) avanco = 100;
  if (atividade.realIni && !atividade.realFim && avanco === 0) avanco = 10;
  avanco = Math.min(100, Math.max(0, avanco));

  // Pavimentos concluídos / realizados
  let pavsConcluidos = Math.round((avanco / 100) * totalPavs);
  let pavAtual = null;

  if (atividade.pavimentoAtualId) {
    pavAtual = proj.locais?.find((l) => l.id === atividade.pavimentoAtualId) || null;
    if (pavAtual && locaisTorre.length > 0) {
      const idxAtual = locaisTorre.findIndex((l) => l.id === atividade.pavimentoAtualId);
      if (idxAtual >= 0 && tIni >= 0) {
        pavsConcluidos = Math.max(1, Math.abs(idxAtual - tIni) + 1);
        avanco = Math.min(100, Math.max(0, Math.round((pavsConcluidos / totalPavs) * 100)));
      }
    }
  } else if (locaisTorre.length > 0 && tIni >= 0) {
    const step = tFim >= tIni ? 1 : -1;
    const idxEstimado = Math.min(
      locaisTorre.length - 1,
      Math.max(0, tIni + (pavsConcluidos > 0 ? (pavsConcluidos - 1) * step : 0))
    );
    pavAtual = locaisTorre[idxEstimado] || null;
  }

  // ── Posição onde a Linha de Corte Hoje corta o traçado da atividade ──
  let fracTempoCorte = 0;
  let pctPrevistoCorte = 0;
  let pavsPrevistosCorte = 0;
  let pavCorteNome = null;
  let corteHojeAtivo = false;

  if (refData < di) {
    // A linha Hoje ainda não alcançou o início da atividade
    fracTempoCorte = 0;
    pctPrevistoCorte = 0;
    pavsPrevistosCorte = 0;
    pavCorteNome = null;
    corteHojeAtivo = false;
  } else if (refData >= df) {
    // A linha Hoje já ultrapassou o término planejado da atividade
    fracTempoCorte = 1;
    pctPrevistoCorte = 100;
    pavsPrevistosCorte = totalPavs;
    const locFim = proj.locais?.find((l) => l.id === atividade.locFimId);
    pavCorteNome = locFim?.nome || "Conclusão";
    corteHojeAtivo = true;
  } else {
    // A data de corte está no intervalo [dataIni, dataFim]: A linha Hoje CORTA a atividade!
    const diasPassados = Math.max(0, diffDays(di, refData));
    fracTempoCorte = Math.min(1, Math.max(0, diasPassados / duracaoPlan));
    pctPrevistoCorte = Math.round(fracTempoCorte * 100);
    // Pavimentos previstos até o ponto de corte (arredondado para o pavimento planejado)
    pavsPrevistosCorte = Math.max(1, Math.round(fracTempoCorte * totalPavs));
    corteHojeAtivo = true;

    // Determinar o nome do pavimento interceptado pela linha Hoje
    if (locaisTorre.length > 0 && tIni >= 0 && tFim >= 0) {
      const idxCorte = Math.min(
        locaisTorre.length - 1,
        Math.max(0, Math.round(tIni + fracTempoCorte * (tFim - tIni)))
      );
      pavCorteNome = locaisTorre[idxCorte]?.nome || null;
    } else {
      const locIni = proj.locais?.find((l) => l.id === atividade.locIniId);
      const locFim = proj.locais?.find((l) => l.id === atividade.locFimId);
      pavCorteNome = fracTempoCorte < 0.5 ? locIni?.nome : locFim?.nome;
    }
  }

  // Diferenças em relação ao corte da linha Hoje
  const diferencaPavs = pavsConcluidos - pavsPrevistosCorte;
  const diferencaPct = avanco - pctPrevistoCorte;

  // ── Critério de Status conforme regra de negócio da Linha de Balanço ──
  let status = "NAO_INICIADA";

  if (avanco >= 100 || atividade.realFim) {
    status = "CONCLUIDA";
  } else if (refData < di && avanco === 0 && !atividade.realIni) {
    status = "NAO_INICIADA";
  } else if (refData >= di) {
    // A data de corte Hoje já alcançou ou passou da atividade:
    // Se o avanço realizado (em pavimentos ou %) for MENOR que o momento onde a linha Hoje corta:
    if (pavsConcluidos < pavsPrevistosCorte || avanco < pctPrevistoCorte) {
      status = "ATRASADA";
    } else {
      status = "EM_ANDAMENTO";
    }
  } else {
    status = "EM_ANDAMENTO";
  }

  return {
    status,
    avanco,
    pavsConcluidos,
    pavsPrevistosCorte,
    pctPrevistoCorte,
    diferencaPavs,
    diferencaPct,
    pavCorteNome,
    pavAtualNome: pavAtual?.nome || null,
    totalPavs,
    duracaoPlan,
    fracTempoCorte,
    emAtraso: status === "ATRASADA",
    corteHojeAtivo,
  };
}
