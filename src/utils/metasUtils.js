import { D, iso, addDays, diffDays, fmtBR, hoje } from "./dateUtils";
import { DIAS_MES } from "../constants/theme";

/* ─── Cálculo de Metas e Planejamento Lookahead ─────────────── */

/**
 * Calcula o progresso e as metas de cada atividade dentro de uma janela de tempo [tIni, tFim].
 */
export function calcularMetasAtividades({ proj, rows, rowIdx, dataRef, dataFimPeriodo }) {
  const ref = dataRef ? D(dataRef) : hoje();
  const fimPeriodo = dataFimPeriodo ? D(dataFimPeriodo) : addDays(ref, 30);

  const ativs = proj.atividades.filter(
    (a) => a.visivel !== false && rowIdx[a.locIniId] != null && rowIdx[a.locFimId] != null
  );

  let totalPavimentosGeral = 0;
  let totalPavimentosMetaPeriodo = 0;
  let totalPavimentosConcluidos = 0;

  const resultadoAtividades = ativs.map((a) => {
    const i = rowIdx[a.locIniId];
    const f = rowIdx[a.locFimId];
    const nLoc = Math.abs(f - i) + 1;
    totalPavimentosGeral += nLoc;

    const di = D(a.dataIni);
    const df = D(a.dataFim);
    const duracaoTotal = Math.max(1, diffDays(di, df));
    const ritmoMes = (nLoc / duracaoTotal) * DIAS_MES;

    // 1. Progresso até a data de referência (Hoje)
    let percConcluidoAteHoje = 0;
    let pavConcluidosAteHoje = 0;
    if (a.realFim) {
      percConcluidoAteHoje = 100;
      pavConcluidosAteHoje = nLoc;
    } else if (a.avanco != null && Number(a.avanco) > 0) {
      percConcluidoAteHoje = Math.min(100, Math.max(0, Number(a.avanco)));
      pavConcluidosAteHoje = Math.round((percConcluidoAteHoje / 100) * nLoc);
    } else if (ref >= df) {
      percConcluidoAteHoje = 100;
      pavConcluidosAteHoje = nLoc;
    } else if (ref > di) {
      const p = Math.min(1, Math.max(0, diffDays(di, ref) / duracaoTotal));
      percConcluidoAteHoje = Math.round(p * 100);
      pavConcluidosAteHoje = Math.round(p * nLoc);
    }
    totalPavimentosConcluidos += pavConcluidosAteHoje;

    // 2. Interseção da atividade com a janela de metas [ref, fimPeriodo]
    // Apenas o que está PARA FRENTE de hoje dentro da janela
    const iniJanela = new Date(Math.max(ref.getTime(), di.getTime()));
    const fimJanela = new Date(Math.min(fimPeriodo.getTime(), df.getTime()));

    const temMetaNoPeriodo = iniJanela <= fimJanela && fimPeriodo >= di && ref <= df && percConcluidoAteHoje < 100;

    let pavimentosNoPeriodo = 0;
    let percNoPeriodo = 0;
    let pavIniPeriodoNome = "—";
    let pavFimPeriodoNome = "—";
    let listaPavimentosPeriodo = [];

    if (temMetaNoPeriodo) {
      const pIni = Math.min(1, Math.max(0, diffDays(di, iniJanela) / duracaoTotal));
      const pFim = Math.min(1, Math.max(0, diffDays(di, fimJanela) / duracaoTotal));

      percNoPeriodo = Math.max(0, Math.min(100 - percConcluidoAteHoje, Math.round((pFim - pIni) * 100)));

      // Índices dos pavimentos a executar no período
      const idxStart = Math.round(i + pIni * (f - i));
      const idxEnd = Math.round(i + pFim * (f - i));
      const lo = Math.min(idxStart, idxEnd);
      const hi = Math.max(idxStart, idxEnd);

      pavimentosNoPeriodo = Math.max(1, hi - lo + 1);
      // Limitar ao saldo restante de pavimentos
      const saldoRestante = nLoc - pavConcluidosAteHoje;
      pavimentosNoPeriodo = Math.min(saldoRestante, pavimentosNoPeriodo);
      totalPavimentosMetaPeriodo += pavimentosNoPeriodo;

      if (rows[idxStart]) pavIniPeriodoNome = rows[idxStart].nome;
      if (rows[idxEnd]) pavFimPeriodoNome = rows[idxEnd].nome;

      for (let u = lo; u <= hi; u++) {
        if (rows[u]) {
          listaPavimentosPeriodo.push(rows[u].nome);
        }
      }
    }

    const percAcumuladoFinalPeriodo = Math.min(100, percConcluidoAteHoje + percNoPeriodo);
    const percSaldoFuturo = Math.max(0, 100 - percAcumuladoFinalPeriodo);

    const torre = proj.torres.find((t) => t.id === a.torreId);
    const locIni = proj.locais.find((l) => l.id === a.locIniId);
    const locFim = proj.locais.find((l) => l.id === a.locFimId);

    // Estado da atividade em relação ao período
    let estadoMeta = "fora_periodo";
    if (percConcluidoAteHoje >= 100) {
      estadoMeta = "concluida";
    } else if (temMetaNoPeriodo) {
      if (ref < di) {
        estadoMeta = "iniciar_no_periodo";
      } else {
        estadoMeta = "em_andamento";
      }
    } else if (di > fimPeriodo) {
      estadoMeta = "futura";
    }

    return {
      id: a.id,
      nome: a.nome,
      cor: a.cor,
      modo: a.modo,
      torreId: a.torreId,
      torreNome: torre?.nome || "Torre 1",
      dataIni: a.dataIni,
      dataFim: a.dataFim,
      duracaoTotal,
      ritmoMes,
      nLoc,
      locIniNome: locIni?.nome || "",
      locFimNome: locFim?.nome || "",
      // Métricas de progresso e metas
      percConcluidoAteHoje,
      pavConcluidosAteHoje,
      percNoPeriodo,
      pavimentosNoPeriodo,
      percAcumuladoFinalPeriodo,
      percSaldoFuturo,
      temMetaNoPeriodo,
      iniJanela: temMetaNoPeriodo ? iniJanela : null,
      fimJanela: temMetaNoPeriodo ? fimJanela : null,
      pavIniPeriodoNome,
      pavFimPeriodoNome,
      listaPavimentosPeriodo,
      estadoMeta,
    };
  });

  const diasNoPeriodo = diffDays(ref, fimPeriodo);
  const resumoGeral = calcularResumoMetas(resultadoAtividades, diasNoPeriodo);

  return {
    dataRef: ref,
    dataFimPeriodo: fimPeriodo,
    diasNoPeriodo,
    ...resumoGeral,
    totalPavimentosGeral,
    totalPavimentosConcluidos,
    totalPavimentosMetaPeriodo,
    todasAtividades: resultadoAtividades,
  };
}

/**
 * Calcula o resumo consolidado de metas e avanço com peso igual (1/N) por atividade.
 * Cada atividade representa 100% do seu escopo, evitando distorções por soma de pavimentos.
 */
export function calcularResumoMetas(listaAtividades, diasNoPeriodo = 30) {
  const total = listaAtividades ? listaAtividades.length : 0;
  if (total === 0) {
    return {
      totalAtividades: 0,
      pesoIndividual: 0,
      percGeralConcluido: 0,
      percGeralMetaPeriodo: 0,
      percAcumuladoPrevisto: 0,
      atividadesComMeta: [],
      totalAtividadesConcluidas: 0,
      totalAtividadesEmAndamento: 0,
      totalAtividadesNaoIniciadas: 0,
      diasNoPeriodo,
    };
  }

  // Cada atividade vale 100% de si mesma. O peso de cada uma no total é 1 / total (1/N).
  // A evolução geral é a média aritmética das evoluções de todas as atividades.
  const somaProgresso = listaAtividades.reduce((s, a) => s + (a.percConcluidoAteHoje || 0), 0);
  const somaMeta = listaAtividades.reduce((s, a) => s + (a.percNoPeriodo || 0), 0);

  const percGeralConcluido = Math.round(somaProgresso / total);
  const percGeralMetaPeriodo = Math.round(somaMeta / total);
  const percAcumuladoPrevisto = Math.min(100, percGeralConcluido + percGeralMetaPeriodo);

  const atividadesComMeta = listaAtividades.filter((a) => a.temMetaNoPeriodo && a.percNoPeriodo > 0);
  const totalAtividadesConcluidas = listaAtividades.filter((a) => a.percConcluidoAteHoje >= 100).length;
  const totalAtividadesEmAndamento = listaAtividades.filter(
    (a) => a.percConcluidoAteHoje > 0 && a.percConcluidoAteHoje < 100
  ).length;
  const totalAtividadesNaoIniciadas = listaAtividades.filter((a) => a.percConcluidoAteHoje === 0).length;

  return {
    totalAtividades: total,
    pesoIndividual: Number((100 / total).toFixed(1)),
    percGeralConcluido,
    percGeralMetaPeriodo,
    percAcumuladoPrevisto,
    atividadesComMeta,
    totalAtividadesConcluidas,
    totalAtividadesEmAndamento,
    totalAtividadesNaoIniciadas,
    diasNoPeriodo,
  };
}
