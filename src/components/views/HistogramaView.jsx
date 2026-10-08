// src/components/views/HistogramaView.jsx
import React, { useState, useMemo } from "react";
import {
  Users,
  BarChart3,
  Calendar,
  Building2,
  TrendingUp,
  Download,
  Filter,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  Layers,
  ChevronRight,
  HardHat,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Construction,
} from "lucide-react";
import * as XLSX from "xlsx";
import { ORANGE, OK, ERRO, NUM, FONT } from "../../constants/theme";
import { D, iso, hoje, fmtBR, diffDays, addDays } from "../../utils/dateUtils";
import { normalizar } from "../../utils/geometryUtils";
import { baixar } from "../../utils/exportUtils";
import { CARGOS_PADRAO, getCargoCor, PALETA_CARGOS } from "../../constants/cargos";
import { apiClient } from "../../utils/apiClient";

// ── Helper: Escala Inteligente e Arredondada do Eixo Y ──
export const calcularEscalaY = (maxValor) => {
  const vMax = Number(maxValor) || 0;
  if (vMax <= 0) {
    return { maxEixoY: 5, passo: 1, ticks: [0, 1, 2, 3, 4, 5] };
  }

  // Valores baixos (1 a 4)
  if (vMax <= 4) {
    const maxEixoY = vMax + 1;
    const ticks = [];
    for (let i = 0; i <= maxEixoY; i++) ticks.push(i);
    return { maxEixoY, passo: 1, ticks };
  }

  // Passos convenientes para mão de obra (número inteiro de homens)
  const passos = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 500];

  for (const passo of passos) {
    const qtdDiv = Math.ceil(vMax / passo);
    if (qtdDiv >= 3 && qtdDiv <= 5) {
      let maxEixoY = qtdDiv * passo;
      // Adiciona uma folga no topo se o pico bater exatamente no limite superior
      if (maxEixoY === vMax) {
        maxEixoY += passo;
      }
      const ticks = [];
      for (let t = 0; t <= maxEixoY; t += passo) {
        ticks.push(t);
      }
      return { maxEixoY, passo, ticks };
    }
  }

  // Fallback caso ultrapasse os passos tabelados
  const passoFallback = Math.max(1, Math.ceil(vMax / 4));
  let maxEixoY = passoFallback * 4;
  if (maxEixoY <= vMax) maxEixoY += passoFallback;
  const ticks = [];
  for (let t = 0; t <= maxEixoY; t += passoFallback) {
    ticks.push(t);
  }
  return { maxEixoY, passo: passoFallback, ticks };
};

// ── Helper: Controle de Exibição de Rótulos do Eixo X ──
export const calcularSeExibeLabelX = (idx, total, temEfetivo) => {
  if (total <= 14) return true;
  if (temEfetivo) return true; // Sempre exibe dias com medição de mão de obra
  if (idx === 0 || idx === total - 1) return true; // Sempre exibe primeiro e último dia
  if (total <= 25) return idx % 2 === 0;
  if (total <= 45) return idx % 3 === 0;
  return idx % 5 === 0;
};

export const HistogramaView = ({
  T,
  proj,
  setProj,
  filtroTorre: filtroTorreInicial = "TODAS",
  onAbrirModalApontar,
  onSelectAtividade,
  flash,
  user,
  userRole,
  permissoes,
  onVoltarAoGrafico,
  podeEditar = true,
}) => {
  // Desativa o uso e ativa o borrado para usuários de nível Admin
  const bloqueadoAdmin =
    userRole === "admin" ||
    (permissoes && permissoes.isAdmin && !permissoes.isDev);
  const [filtroTorre, setFiltroTorre] = useState(filtroTorreInicial);
  const [buscaAtividade, setBuscaAtividade] = useState("");
  const [cargoFiltro, setCargoFiltro] = useState("TODOS");
  const [granularidade, setGranularidade] = useState("diario"); // "diario" | "semanal" | "mensal"
  const [cargosOcultos, setCargosOcultos] = useState(new Set());
  const [tooltipInfo, setTooltipInfo] = useState(null);

  // Período de análise com foco inteligente nos apontamentos
  const [filtroPeriodo, setFiltroPeriodo] = useState("auto"); // "auto" | "15d" | "30d" | "mes" | "custom"
  const [dataInicioCustom, setDataInicioCustom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return iso(d);
  });
  const [dataFimCustom, setDataFimCustom] = useState(() => iso(new Date()));

  // ── Extração Unificada de Apontamentos de Avanço ──
  const todosApontamentos = useMemo(() => {
    if (!proj || !proj.atividades) return [];
    const lista = [];

    proj.atividades.forEach((ativ) => {
      const torre = proj.torres?.find((t) => t.id === ativ.torreId);
      const historico = Array.isArray(ativ.historicoAvanco) ? ativ.historicoAvanco : [];

      historico.forEach((item) => {
        lista.push({
          ...item,
          atividadeId: ativ.id,
          atividadeNome: ativ.nome,
          torreId: ativ.torreId,
          torreNome: torre?.nome || "Torre",
          corAtividade: ativ.cor,
          modoAtividade: ativ.modo,
        });
      });
    });

    return lista.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
  }, [proj]);

  // ── Apontamentos Filtrados ──
  const apontamentosFiltrados = useMemo(() => {
    return todosApontamentos.filter((item) => {
      if (filtroTorre !== "TODAS" && item.torreId !== filtroTorre) return false;
      if (buscaAtividade) {
        const q = normalizar(buscaAtividade);
        const matchAtiv = normalizar(item.atividadeNome).includes(q);
        const matchTorre = normalizar(item.torreNome).includes(q);
        if (!matchAtiv && !matchTorre) return false;
      }
      if (cargoFiltro !== "TODOS") {
        const temCargo = item.cargos?.some(
          (c) => normalizar(c.cargo) === normalizar(cargoFiltro)
        );
        if (!temCargo) return false;
      }
      return true;
    });
  }, [todosApontamentos, filtroTorre, buscaAtividade, cargoFiltro]);

  // ── Lista de Todos os Cargos Encontrados ──
  const cargosPresentes = useMemo(() => {
    const mapa = new Map();
    todosApontamentos.forEach((item) => {
      (item.cargos || []).forEach((c) => {
        const nome = c.cargo || "Outro";
        if (!mapa.has(nome)) {
          mapa.set(nome, {
            nome,
            cor: c.cor || getCargoCor(nome),
            totalHomens: 0,
            apontamentos: 0,
          });
        }
        const obj = mapa.get(nome);
        obj.totalHomens += Number(c.quantidade) || 0;
        obj.apontamentos += 1;
      });
    });
    return Array.from(mapa.values()).sort((a, b) => b.totalHomens - a.totalHomens);
  }, [todosApontamentos]);

  // ── Agrupamento Temporal para o Gráfico de Histograma ──
  const dadosGrafico = useMemo(() => {
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const formatarDataCurta = (dataObj, gran) => {
      if (gran === "mensal") {
        return `${meses[dataObj.getMonth()]}/${String(dataObj.getFullYear()).slice(-2)}`;
      }
      if (gran === "semanal") {
        const firstDayOfYear = new Date(dataObj.getFullYear(), 0, 1);
        const pastDaysOfYear = (dataObj - firstDayOfYear) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `Sem ${weekNum}`;
      }
      const dia = String(dataObj.getDate()).padStart(2, "0");
      const mes = String(dataObj.getMonth() + 1).padStart(2, "0");
      return `${dia}/${mes}`;
    };

    const formatarDataCompleta = (dataObj, gran) => {
      if (gran === "diario") {
        return `${fmtBR(dataObj)} (${diasSemana[dataObj.getDay()]})`;
      }
      if (gran === "mensal") {
        return `${meses[dataObj.getMonth()]}/${dataObj.getFullYear()}`;
      }
      return fmtBR(dataObj);
    };

    // Determinar range de datas inteligente
    let minD = null;
    let maxD = null;

    if (filtroPeriodo === "auto") {
      if (apontamentosFiltrados.length > 0) {
        apontamentosFiltrados.forEach((ap) => {
          if (!ap.data) return;
          const d = D(ap.data);
          if (!minD || d < minD) minD = new Date(d);
          if (!maxD || d > maxD) maxD = new Date(d);
        });
      }

      if (!minD || !maxD) {
        const h = hoje();
        minD = addDays(h, -3);
        maxD = addDays(h, 3);
      } else {
        const diff = Math.max(0, diffDays(minD, maxD));
        if (diff === 0) {
          // Apenas 1 data com apontamento: janela elegante de ±3 dias (7 dias total)
          minD = addDays(minD, -3);
          maxD = addDays(maxD, 3);
        } else if (diff < 7) {
          // Menos de 7 dias: completa uma janela de cerca de 7 a 9 dias
          const folga = Math.max(1, Math.floor((7 - diff) / 2));
          minD = addDays(minD, -folga);
          maxD = addDays(maxD, folga);
        } else if (diff <= 30) {
          // Até 30 dias: adiciona 1 dia de respiro em cada ponta
          minD = addDays(minD, -1);
          maxD = addDays(maxD, 1);
        }
      }
    } else if (filtroPeriodo === "15d") {
      const h = hoje();
      minD = addDays(h, -14);
      maxD = h;
    } else if (filtroPeriodo === "30d") {
      const h = hoje();
      minD = addDays(h, -29);
      maxD = h;
    } else if (filtroPeriodo === "mes") {
      const h = hoje();
      minD = new Date(h.getFullYear(), h.getMonth(), 1);
      maxD = new Date(h.getFullYear(), h.getMonth() + 1, 0);
    } else if (filtroPeriodo === "custom") {
      minD = dataInicioCustom ? D(dataInicioCustom) : addDays(hoje(), -15);
      maxD = dataFimCustom ? D(dataFimCustom) : hoje();
    }

    if (!minD || !maxD) {
      minD = addDays(hoje(), -3);
      maxD = addDays(hoje(), 3);
    }

    // Criar mapa de buckets (chave de data => dados)
    const buckets = new Map();

    const getChaveBucket = (dataObj) => {
      if (granularidade === "mensal") {
        return `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, "0")}`;
      }
      if (granularidade === "semanal") {
        const firstDayOfYear = new Date(dataObj.getFullYear(), 0, 1);
        const pastDaysOfYear = (dataObj - firstDayOfYear) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `${dataObj.getFullYear()}-Sem ${weekNum}`;
      }
      return iso(dataObj);
    };

    // Preencher dias intermediários no modo diário se intervalo for razoável (<= 90 dias)
    const totalDias = Math.max(1, diffDays(minD, maxD));
    if (granularidade === "diario" && totalDias <= 90) {
      let cur = new Date(minD);
      while (cur <= maxD) {
        const k = iso(cur);
        buckets.set(k, {
          chave: k,
          dataCurta: formatarDataCurta(cur, "diario"),
          dataCompleta: formatarDataCompleta(cur, "diario"),
          diaSemana: diasSemana[cur.getDay()],
          dataLabel: fmtBR(cur),
          dataRaw: new Date(cur),
          total: 0,
          porCargo: {},
          atividades: new Set(),
        });
        cur = addDays(cur, 1);
      }
    }

    // Alocar apontamentos nos buckets
    apontamentosFiltrados.forEach((ap) => {
      if (!ap.data) return;
      const d = D(ap.data);

      // Se filtro não for auto, ignora dados fora do período selecionado
      if (filtroPeriodo !== "auto" && (d < minD || d > maxD)) return;

      const chave = getChaveBucket(d);

      if (!buckets.has(chave)) {
        buckets.set(chave, {
          chave,
          dataCurta: formatarDataCurta(d, granularidade),
          dataCompleta: formatarDataCompleta(d, granularidade),
          diaSemana: diasSemana[d.getDay()],
          dataLabel: granularidade === "diario" ? fmtBR(d) : chave,
          dataRaw: d,
          total: 0,
          porCargo: {},
          atividades: new Set(),
        });
      }

      const b = buckets.get(chave);
      b.atividades.add(ap.atividadeNome);

      (ap.cargos || []).forEach((c) => {
        const cNome = c.cargo || "Outro";
        if (cargosOcultos.has(cNome)) return;
        const qtd = Number(c.quantidade) || 0;
        b.porCargo[cNome] = (b.porCargo[cNome] || 0) + qtd;
        b.total += qtd;
      });
    });

    // Ordenar cronologicamente
    const lista = Array.from(buckets.values()).sort((a, b) => a.dataRaw - b.dataRaw);

    // Calcular acumulado
    let acc = 0;
    return lista.map((item) => {
      acc += item.total;
      return {
        ...item,
        totalAcumulado: acc,
        atividadesLista: Array.from(item.atividades),
      };
    });
  }, [apontamentosFiltrados, filtroPeriodo, dataInicioCustom, dataFimCustom, granularidade, cargosOcultos]);

  // ── Métricas Gerais (KPIs) ──
  const metricas = useMemo(() => {
    let picoHomens = 0;
    let picoData = "—";
    let somaHomens = 0;
    let diasComEfetivo = 0;

    dadosGrafico.forEach((b) => {
      if (b.total > picoHomens) {
        picoHomens = b.total;
        picoData = b.dataLabel;
      }
      if (b.total > 0) {
        somaHomens += b.total;
        diasComEfetivo++;
      }
    });

    const mediaDiaria = diasComEfetivo > 0 ? (somaHomens / diasComEfetivo).toFixed(1) : "0.0";
    const totalHomensDia = somaHomens;
    const cargoTop = cargosPresentes[0] || null;

    return {
      picoHomens,
      picoData,
      mediaDiaria,
      totalHomensDia,
      cargoTop: cargoTop ? `${cargoTop.nome} (${cargoTop.totalHomens} homens)` : "Nenhum",
      totalApontamentos: apontamentosFiltrados.length,
    };
  }, [dadosGrafico, cargosPresentes, apontamentosFiltrados]);

  // ── Mão de Obra Agrupada por Atividade ──
  const resumoAtividades = useMemo(() => {
    if (!proj || !proj.atividades) return [];

    const mapa = new Map();

    proj.atividades.forEach((a) => {
      if (filtroTorre !== "TODAS" && a.torreId !== filtroTorre) return;
      if (buscaAtividade && !normalizar(a.nome).includes(normalizar(buscaAtividade))) return;

      const torre = proj.torres?.find((t) => t.id === a.torreId);
      const historico = Array.isArray(a.historicoAvanco) ? a.historicoAvanco : [];

      let totalH = 0;
      const cargosMap = {};

      historico.forEach((h) => {
        (h.cargos || []).forEach((c) => {
          const qtd = Number(c.quantidade) || 0;
          totalH += qtd;
          cargosMap[c.cargo] = (cargosMap[c.cargo] || 0) + qtd;
        });
      });

      const cargosOrdenados = Object.entries(cargosMap)
        .map(([cargo, qtd]) => ({ cargo, qtd, cor: getCargoCor(cargo) }))
        .sort((x, y) => y.qtd - x.qtd);

      mapa.set(a.id, {
        id: a.id,
        nome: a.nome,
        cor: a.cor,
        torreNome: torre?.nome || "Torre",
        avanco: Number(a.avanco) || 0,
        totalHomens: totalH,
        totalApontamentos: historico.length,
        cargos: cargosOrdenados,
        ultimoApontamento: historico[historico.length - 1] || null,
      });
    });

    return Array.from(mapa.values()).sort((a, b) => b.totalHomens - a.totalHomens);
  }, [proj, filtroTorre, buscaAtividade]);

  // ── Toggle Ocultar Cargo no Gráfico ──
  const toggleCargo = (cargoNome) => {
    setCargosOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(cargoNome)) next.delete(cargoNome);
      else next.add(cargoNome);
      return next;
    });
  };

  // ── Exclusão de Apontamento ──
  const excluirApontamento = async (apontamento) => {
    if (!window.confirm(`Deseja realmente remover o apontamento de avanço da atividade "${apontamento.atividadeNome}"?`)) {
      return;
    }

    try {
      // 1. Remover do objeto do projeto
      setProj((prev) => ({
        ...prev,
        atividades: prev.atividades.map((a) => {
          if (a.id !== apontamento.atividadeId) return a;
          const novoHist = (a.historicoAvanco || []).filter((h) => h.id !== apontamento.id);
          // Recalcular avanço com base no último apontamento restante
          const ultimoRestante = novoHist[novoHist.length - 1];
          const novoAvanco = ultimoRestante ? ultimoRestante.avancoNovo : 0;

          return {
            ...a,
            avanco: novoAvanco,
            historicoAvanco: novoHist,
          };
        }),
      }));

      // 2. Chamar persistência no Supabase
      await apiClient.excluirApontamentoAvanco(apontamento.id);

      if (flash) flash("Apontamento removido com sucesso.");
    } catch (e) {
      console.error("Erro ao excluir apontamento:", e);
      if (flash) flash("Erro ao remover apontamento.");
    }
  };

  // ── Exportação em Excel (.xlsx) Completa ──
  const exportarHistogramaExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Aba 1: Histograma Diário / Período
      const sheetHistograma = dadosGrafico.map((d) => {
        const row = {
          "Data / Período": d.dataLabel,
          "Total de Homens": d.total,
          "Homens Acumulados": d.totalAcumulado,
          "Atividades em Execução": d.atividadesLista.join(", "),
        };
        cargosPresentes.forEach((c) => {
          row[c.nome] = d.porCargo[c.nome] || 0;
        });
        return row;
      });
      const ws1 = XLSX.utils.json_to_sheet(sheetHistograma);
      XLSX.utils.book_append_sheet(wb, ws1, "Histograma de Mão de Obra");

      // Aba 2: Resumo por Cargo
      const sheetCargos = cargosPresentes.map((c) => ({
        "Cargo": c.nome,
        "Total de Homens": c.totalHomens,
        "% do Total": metricas.totalHomensDia > 0 ? `${Math.round((c.totalHomens / metricas.totalHomensDia) * 100)}%` : "0%",
        "Apontamentos Realizados": c.apontamentos,
      }));
      const ws2 = XLSX.utils.json_to_sheet(sheetCargos);
      XLSX.utils.book_append_sheet(wb, ws2, "Resumo por Cargo");

      // Aba 3: Mão de Obra por Atividade
      const sheetAtiv = resumoAtividades.map((a) => ({
        "Torre": a.torreNome,
        "Atividade": a.nome,
        "% Avanço Atual": `${a.avanco}%`,
        "Total de Homens": a.totalHomens,
        "Qtd de Apontamentos": a.totalApontamentos,
        "Cargos Utilizados": a.cargos.map((c) => `${c.qtd}x ${c.cargo}`).join(", "),
        "Último Apontamento": a.ultimoApontamento ? fmtBR(D(a.ultimoApontamento.data)) : "—",
      }));
      const ws3 = XLSX.utils.json_to_sheet(sheetAtiv);
      XLSX.utils.book_append_sheet(wb, ws3, "Mão de Obra por Atividade");

      // Aba 4: Histórico Integral de Apontamentos
      const sheetHist = todosApontamentos.map((h) => ({
        "Data": fmtBR(D(h.data)),
        "Torre": h.torreNome,
        "Atividade": h.atividadeNome,
        "Pavimento": h.pavimentoNome || "—",
        "Avanço Anterior": `${h.avancoAnterior}%`,
        "Avanço Novo": `${h.avancoNovo}%`,
        "Delta (% Avançado)": `+${h.deltaAvanco}%`,
        "Total de Homens": h.homensTotal,
        "Equipe Detalhada": (h.cargos || []).map((c) => `${c.quantidade} ${c.cargo}`).join(", "),
        "Observação": h.observacao || "",
        "Usuário": h.userNome || "—",
      }));
      const ws4 = XLSX.utils.json_to_sheet(sheetHist);
      XLSX.utils.book_append_sheet(wb, ws4, "Histórico de Apontamentos");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const nomeBase = (proj.nome || "histograma-obra").replace(/[\/\\:*?"<>|]/g, "-");
      baixar(`histograma-mao-de-obra-${nomeBase}.xlsx`, wbout, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", flash);
      if (flash) flash("Histograma de mão de obra exportado com sucesso (.xlsx)");
    } catch (e) {
      console.error(e);
      if (flash) flash("Erro ao exportar planilha de histograma");
    }
  };

  // Cálculo de Escala do Gráfico (Eixo Y com passos limpos e base zero)
  const escalaY = useMemo(() => {
    const maxVal = Math.max(...dadosGrafico.map((d) => d.total), 0);
    return calcularEscalaY(maxVal);
  }, [dadosGrafico]);

  const periodoLegivel = useMemo(() => {
    if (!dadosGrafico.length) return "";
    const prim = dadosGrafico[0];
    const ult = dadosGrafico[dadosGrafico.length - 1];
    return `${prim.dataCurta} a ${ult.dataCurta} (${dadosGrafico.length} ${dadosGrafico.length === 1 ? "dia" : "dias"})`;
  }, [dadosGrafico]);

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden relative"
      style={{ background: T.bg, fontFamily: FONT, color: T.text }}
    >
      {/* Conteúdo do Histograma (com blur e bloqueio de cliques caso seja Admin) */}
      <div
        className="flex-1 flex flex-col h-full overflow-hidden transition-all duration-300"
        style={bloqueadoAdmin ? { filter: "blur(7px)", pointerEvents: "none", userSelect: "none" } : {}}
      >
        {/* ── Topo do Painel de Histograma ── */}
        <div
          className="p-4 shrink-0 border-b flex flex-col gap-4"
          style={{ background: T.panel, borderColor: T.line }}
        >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
              style={{
                background: "linear-gradient(135deg, #FE5000 0%, #FF7839 100%)",
                boxShadow: "0 4px 14px rgba(254, 80, 0, 0.28)",
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold" style={{ color: T.text }}>
                  Histograma de Mão de Obra
                </h1>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ORANGE}22`, color: ORANGE }}
                >
                  Tempo × Recursos
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                Acompanhe o dimensionamento de homens e distribuição de cargos ao longo das atividades da obra.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onAbrirModalApontar && podeEditar && (
              <button
                onClick={() => onAbrirModalApontar()}
                className="text-xs px-3.5 py-2 rounded-xl font-bold text-white flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #FE5000 0%, #E04600 100%)",
                }}
              >
                <Plus size={14} /> Registrar Apontamento
              </button>
            )}

            <button
              onClick={exportarHistogramaExcel}
              className="text-xs px-3.5 py-2 rounded-xl font-bold text-white flex items-center gap-1.5 shadow-xs transition-all hover:brightness-110 cursor-pointer"
              style={{ background: "#1D6F42" }}
              title="Exportar dados completos do histograma em Excel (.xlsx)"
            >
              <Download size={14} /> Exportar Excel (.xlsx)
            </button>
          </div>
        </div>

        {/* ── Cards de Indicadores de Mão de Obra (KPIs) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Card 1: Pico de Mão de Obra */}
          <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: T.raised, borderColor: T.line }}>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: T.dim }}>
              Pico de Efetivo
            </span>
            <div className="mt-1">
              <span className="text-xl font-black" style={{ ...NUM, color: ORANGE }}>
                {metricas.picoHomens}
              </span>
              <span className="text-xs ml-1 font-semibold" style={{ color: T.muted }}>
                homens
              </span>
            </div>
            <span className="text-[10.5px] truncate mt-1" style={{ color: T.muted }}>
              Em: <span className="font-bold text-white/90">{metricas.picoData}</span>
            </span>
          </div>

          {/* Card 2: Média Diária */}
          <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: T.raised, borderColor: T.line }}>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: T.dim }}>
              Média Diária
            </span>
            <div className="mt-1">
              <span className="text-xl font-black" style={{ ...NUM, color: OK }}>
                {metricas.mediaDiaria}
              </span>
              <span className="text-xs ml-1 font-semibold" style={{ color: T.muted }}>
                homens/dia
              </span>
            </div>
            <span className="text-[10.5px] text-emerald-400 font-medium mt-1">
              Dias c/ medição
            </span>
          </div>

          {/* Card 3: Total de Homens */}
          <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: T.raised, borderColor: T.line }}>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: T.dim }}>
              Total de Homens
            </span>
            <div className="mt-1">
              <span className="text-xl font-black" style={{ ...NUM, color: "#38BDF8" }}>
                {metricas.totalHomensDia}
              </span>
              <span className="text-xs ml-1 font-semibold" style={{ color: T.muted }}>
                homens
              </span>
            </div>
            <span className="text-[10.5px]" style={{ color: T.muted }}>
              Efetivo total alocado
            </span>
          </div>

          {/* Card 4: Cargo Principal */}
          <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: T.raised, borderColor: T.line }}>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: T.dim }}>
              Cargo Mais Demandado
            </span>
            <div className="mt-1">
              <span className="text-sm font-bold truncate block" style={{ color: T.text }}>
                {metricas.cargoTop}
              </span>
            </div>
            <span className="text-[10.5px]" style={{ color: T.muted }}>
              Maior alocação
            </span>
          </div>

          {/* Card 5: Total de Apontamentos */}
          <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: T.raised, borderColor: T.line }}>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: T.dim }}>
              Total de Registros
            </span>
            <div className="mt-1">
              <span className="text-xl font-black" style={{ ...NUM, color: T.text }}>
                {metricas.totalApontamentos}
              </span>
              <span className="text-xs ml-1 font-semibold" style={{ color: T.muted }}>
                apontamentos
              </span>
            </div>
            <span className="text-[10.5px]" style={{ color: T.muted }}>
              Gravados no banco
            </span>
          </div>

          {/* Card 6: Atividades Ativas */}
          <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: T.raised, borderColor: T.line }}>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: T.dim }}>
              Atividades c/ Equipe
            </span>
            <div className="mt-1">
              <span className="text-xl font-black" style={{ ...NUM, color: T.text }}>
                {resumoAtividades.filter((a) => a.totalHomens > 0).length}
              </span>
              <span className="text-xs ml-1 font-semibold" style={{ color: T.muted }}>
                atividades
              </span>
            </div>
            <span className="text-[10.5px]" style={{ color: T.muted }}>
              Na torre ativa
            </span>
          </div>
        </div>

        {/* ── Barra de Filtros e Parâmetros ── */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          {/* Torre */}
          <div className="flex items-center gap-1.5">
            <Building2 size={14} style={{ color: T.dim }} />
            <select
              value={filtroTorre}
              onChange={(e) => setFiltroTorre(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg outline-none border font-medium cursor-pointer"
              style={{ background: T.input, borderColor: T.line, color: T.text }}
            >
              <option value="TODAS">Todas as torres</option>
              {proj.torres?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Granularidade */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: T.line }}>
            {[
              ["diario", "Diário"],
              ["semanal", "Semanal"],
              ["mensal", "Mensal"],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setGranularidade(k)}
                className="px-2.5 py-1.5 transition-colors font-semibold"
                style={{
                  background: granularidade === k ? ORANGE : T.raised,
                  color: granularidade === k ? "#ffffff" : T.muted,
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Filtro de Período Temporal */}
          <div className="flex items-center gap-1.5">
            <Calendar size={14} style={{ color: T.dim }} />
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg outline-none border font-medium cursor-pointer"
              style={{ background: T.input, borderColor: T.line, color: T.text }}
            >
              <option value="auto">Foco nos Registros (Auto)</option>
              <option value="15d">Últimos 15 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="mes">Mês Atual</option>
              <option value="custom">Personalizado...</option>
            </select>

            {filtroPeriodo === "custom" && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={dataInicioCustom}
                  onChange={(e) => setDataInicioCustom(e.target.value)}
                  className="px-2 py-1 rounded-lg outline-none border text-[11px]"
                  style={{ background: T.input, borderColor: T.line, color: T.text }}
                />
                <span style={{ color: T.dim }}>a</span>
                <input
                  type="date"
                  value={dataFimCustom}
                  onChange={(e) => setDataFimCustom(e.target.value)}
                  className="px-2 py-1 rounded-lg outline-none border text-[11px]"
                  style={{ background: T.input, borderColor: T.line, color: T.text }}
                />
              </div>
            )}
          </div>

          {/* Filtro de Cargo */}
          <select
            value={cargoFiltro}
            onChange={(e) => setCargoFiltro(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg outline-none border font-medium cursor-pointer"
            style={{ background: T.input, borderColor: T.line, color: T.text }}
          >
            <option value="TODOS">Todos os cargos</option>
            {cargosPresentes.map((c) => (
              <option key={c.nome} value={c.nome}>
                {c.nome} ({c.totalHomens} homens)
              </option>
            ))}
          </select>

          {/* Busca de Atividade */}
          <div className="flex-1 min-w-[180px] relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.dim }} />
            <input
              type="text"
              placeholder="Buscar por atividade..."
              value={buscaAtividade}
              onChange={(e) => setBuscaAtividade(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg outline-none border"
              style={{ background: T.input, borderColor: T.line, color: T.text }}
            />
          </div>
        </div>
      </div>

      {/* ── Conteúdo Principal com Rolagem ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Caso não existam apontamentos com mão de obra */}
        {todosApontamentos.length === 0 ? (
          <div
            className="p-8 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 my-4"
            style={{ background: T.panel, borderColor: T.line }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: `${ORANGE}15`, color: ORANGE }}
            >
              <HardHat size={32} />
            </div>
            <h2 className="text-base font-bold" style={{ color: T.text }}>
              Nenhum Apontamento de Mão de Obra Registrado
            </h2>
            <p className="text-xs max-w-lg leading-relaxed" style={{ color: T.muted }}>
              O Histograma é gerado automaticamente a partir dos apontamentos da aba <strong>Avanço Físico</strong>. Ao indicar o avanço das atividades com a quantidade de homens e seus cargos, os dados são salvos no banco de dados e refletem em tempo real neste painel.
            </p>
            {onAbrirModalApontar && (
              <button
                onClick={() => onAbrirModalApontar()}
                className="mt-2 text-xs px-4 py-2 rounded-xl font-bold text-white shadow-md flex items-center gap-1.5 hover:scale-105 transition-all cursor-pointer"
                style={{ background: ORANGE }}
              >
                <Plus size={14} /> Registrar Primeiro Avanço com Equipe
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── 1. GRÁFICO PRINCIPAL DE HISTOGRAMA DE MÃO DE OBRA ── */}
            <div
              className="p-4 sm:p-5 rounded-2xl border shadow-xs"
              style={{ background: T.panel, borderColor: T.line }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: T.text }}>
                    <BarChart3 size={16} style={{ color: ORANGE }} />
                    Distribuição Temporal de Homens por Cargo
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                    Passe o cursor sobre as barras para inspecionar os cargos e atividades daquele período.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {periodoLegivel && (
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border"
                      style={{ background: T.raised, borderColor: T.line, color: T.muted }}
                    >
                      <Calendar size={13} style={{ color: ORANGE }} />
                      {periodoLegivel}
                    </span>
                  )}

                  {/* Tag de Pico */}
                  <div
                    className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    style={{ background: `${ORANGE}18`, color: ORANGE, border: `1px solid ${ORANGE}30` }}
                  >
                    <TrendingUp size={13} />
                    Pico Máximo: {metricas.picoHomens} homens ({metricas.picoData})
                  </div>
                </div>
              </div>

              {/* Área do Gráfico Interativo com Eixos Calibrados */}
              <div className="relative w-full select-none">
                {dadosGrafico.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs" style={{ color: T.muted }}>
                    Nenhum dado encontrado para o filtro aplicado.
                  </div>
                ) : (
                  <div className="w-full flex flex-col">
                    {/* Linha Superior: Eixo Y (Gutter) + Área de Plotagem das Barras */}
                    <div className="h-64 sm:h-72 w-full flex relative">
                      {/* 1. Gutter do Eixo Y (fixo, à esquerda, nunca corta rótulos) */}
                      <div className="w-9 sm:w-11 shrink-0 relative select-none">
                        {escalaY.ticks.map((tick) => {
                          const bottomPct = escalaY.maxEixoY > 0 ? (tick / escalaY.maxEixoY) * 100 : 0;
                          return (
                            <div
                              key={tick}
                              className="absolute right-2 -translate-y-1/2 text-[10px] font-bold text-right"
                              style={{
                                bottom: `${bottomPct}%`,
                                color: T.dim,
                                ...NUM,
                              }}
                            >
                              {tick}
                            </div>
                          );
                        })}
                      </div>

                      {/* 2. Área de Plotagem (Grades + Barras Empilhadas) */}
                      <div
                        className="flex-1 relative border-l border-b flex items-end overflow-hidden"
                        style={{ borderColor: T.line }}
                      >
                        {/* Linhas de Grade Horizontais alinhadas aos ticks */}
                        {escalaY.ticks.map((tick) => {
                          if (tick === 0) return null; // Linha 0 é a border-b
                          const bottomPct = escalaY.maxEixoY > 0 ? (tick / escalaY.maxEixoY) * 100 : 0;
                          return (
                            <div
                              key={tick}
                              className="absolute left-0 right-0 border-t border-dashed pointer-events-none z-0"
                              style={{
                                bottom: `${bottomPct}%`,
                                borderColor: `${T.line}35`,
                              }}
                            />
                          );
                        })}

                        {/* Colunas do Histograma */}
                        <div className="w-full h-full flex items-end gap-1 sm:gap-2 px-1 sm:px-2 z-10">
                          {dadosGrafico.map((d, idx) => {
                            const alturaPct = escalaY.maxEixoY > 0 ? Math.min(100, (d.total / escalaY.maxEixoY) * 100) : 0;
                            const isPico = d.total === metricas.picoHomens && metricas.picoHomens > 0;

                            return (
                              <div
                                key={d.chave || idx}
                                className="flex-1 min-w-0 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                                onMouseEnter={() => setTooltipInfo(d)}
                                onMouseLeave={() => setTooltipInfo(null)}
                              >
                                {/* Barra Empilhada */}
                                <div
                                  className="w-full max-w-[42px] relative flex flex-col-reverse transition-all group-hover:brightness-125"
                                  style={{
                                    height: `${Math.max(d.total > 0 ? 3 : 0, alturaPct)}%`,
                                    minHeight: d.total > 0 ? 6 : 0,
                                  }}
                                >
                                  {/* Pin do Pico logo acima da barra */}
                                  {isPico && (
                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none animate-bounce">
                                      <span
                                        className="text-[9.5px] px-1.5 py-0.5 rounded-md font-black text-white shadow-md whitespace-nowrap"
                                        style={{ background: ORANGE }}
                                      >
                                        {d.total}
                                      </span>
                                      <div
                                        className="w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-t-[4px] border-transparent"
                                        style={{ borderTopColor: ORANGE }}
                                      />
                                    </div>
                                  )}

                                  {/* Segmentos por Cargo */}
                                  <div className="w-full h-full rounded-t-sm overflow-hidden flex flex-col-reverse shadow-xs">
                                    {Object.entries(d.porCargo).map(([cNome, cQtd]) => {
                                      const segPct = d.total > 0 ? (cQtd / d.total) * 100 : 0;
                                      return (
                                        <div
                                          key={cNome}
                                          style={{
                                            height: `${segPct}%`,
                                            background: getCargoCor(cNome),
                                          }}
                                          title={`${cNome}: ${cQtd} homens`}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Linha Inferior: Rótulos do Eixo X */}
                    <div className="w-full flex items-start pt-1.5">
                      {/* Espaçador alinhado com o Eixo Y */}
                      <div className="w-9 sm:w-11 shrink-0" />

                      {/* Rótulos das Datas */}
                      <div className="flex-1 flex items-start gap-1 sm:gap-2 px-1 sm:px-2">
                        {dadosGrafico.map((d, idx) => {
                          const deveMostrar = calcularSeExibeLabelX(idx, dadosGrafico.length, d.total > 0);
                          return (
                            <div
                              key={d.chave || idx}
                              className="flex-1 min-w-0 text-center flex flex-col items-center"
                              title={`${d.dataCompleta} (${d.total} homens)`}
                            >
                              {deveMostrar ? (
                                <span
                                  className={`text-[9.5px] truncate w-full transition-all block ${d.total > 0 ? "font-bold" : "font-normal"}`}
                                  style={{
                                    color: d.total > 0 ? ORANGE : T.dim,
                                    transform: dadosGrafico.length > 20 ? "rotate(-30deg)" : "none",
                                    transformOrigin: "center top",
                                  }}
                                >
                                  {d.dataCurta}
                                </span>
                              ) : (
                                <span
                                  className="w-1 h-1 rounded-full opacity-30 mt-1 inline-block"
                                  style={{ background: T.dim }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tooltip Flutuante Rico */}
                {tooltipInfo && (
                  <div
                    className="absolute top-2 right-4 p-3 rounded-xl border shadow-xl z-20 pointer-events-none animate-in fade-in"
                    style={{
                      background: T.panel,
                      borderColor: T.line,
                      minWidth: 200,
                    }}
                  >
                    <div className="flex items-center justify-between border-b pb-1.5 mb-1.5" style={{ borderColor: T.line }}>
                      <span className="text-xs font-bold" style={{ color: T.text }}>
                        {tooltipInfo.dataLabel}
                      </span>
                      <span className="text-xs font-black" style={{ ...NUM, color: ORANGE }}>
                        {tooltipInfo.total} homens
                      </span>
                    </div>

                    {/* Cargos */}
                    <div className="space-y-1 mb-2">
                      {Object.entries(tooltipInfo.porCargo).map(([cNome, cQtd]) => (
                        <div key={cNome} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ background: getCargoCor(cNome) }}
                            />
                            {cNome}
                          </span>
                          <span className="font-bold" style={{ ...NUM, color: T.text }}>
                            {cQtd}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Atividades no dia */}
                    {tooltipInfo.atividadesLista?.length > 0 && (
                      <div className="text-[10px] pt-1.5 border-t" style={{ borderColor: T.line, color: T.muted }}>
                        <span className="font-bold block mb-0.5" style={{ color: T.dim }}>
                          Frentes / Atividades:
                        </span>
                        <div className="truncate max-w-[220px]">
                          {tooltipInfo.atividadesLista.join(", ")}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Legenda de Cargos Interativa */}
              <div className="flex items-center justify-center gap-2 flex-wrap pt-4 border-t mt-3" style={{ borderColor: T.line }}>
                <span className="text-[10px] uppercase font-bold mr-1" style={{ color: T.dim }}>
                  Legenda de Cargos:
                </span>
                {cargosPresentes.map((c) => {
                  const oculto = cargosOcultos.has(c.nome);
                  return (
                    <button
                      key={c.nome}
                      onClick={() => toggleCargo(c.nome)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer hover:scale-105"
                      style={{
                        background: oculto ? "transparent" : `${c.cor}18`,
                        borderColor: oculto ? T.line : `${c.cor}60`,
                        opacity: oculto ? 0.45 : 1,
                        textDecoration: oculto ? "line-through" : "none",
                      }}
                      title="Clique para ocultar ou exibir este cargo no gráfico"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: c.cor }} />
                      <span className="font-semibold text-[11px]" style={{ color: T.text }}>
                        {c.nome}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: T.muted, ...NUM }}>
                        ({c.totalHomens})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 2. SEÇÃO DUPLA: MÃO DE OBRA POR ATIVIDADE & COMPOSIÇÃO DE CARGOS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Tabela de Mão de Obra por Atividade (2 Colunas) */}
              <div
                className="lg:col-span-2 p-4 rounded-2xl border shadow-xs flex flex-col"
                style={{ background: T.panel, borderColor: T.line }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: T.text }}>
                      <Layers size={16} style={{ color: OK }} />
                      Mão de Obra Alocada por Atividade
                    </h3>
                    <p className="text-xs" style={{ color: T.muted }}>
                      Histórico acumulado de homens aplicados em cada atividade da torre.
                    </p>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: T.dim }}>
                    {resumoAtividades.length} atividades listadas
                  </span>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b" style={{ borderColor: T.line }}>
                        <th className="py-2 px-2 font-bold uppercase tracking-wider" style={{ color: T.dim }}>
                          Atividade
                        </th>
                        <th className="py-2 px-2 font-bold uppercase tracking-wider text-center" style={{ color: T.dim }}>
                          Torre
                        </th>
                        <th className="py-2 px-2 font-bold uppercase tracking-wider text-center" style={{ color: T.dim }}>
                          % Avanço
                        </th>
                        <th className="py-2 px-2 font-bold uppercase tracking-wider text-center" style={{ color: T.dim }}>
                          Total Homens
                        </th>
                        <th className="py-2 px-2 font-bold uppercase tracking-wider" style={{ color: T.dim }}>
                          Cargos Envolvidos
                        </th>
                        <th className="py-2 px-2 font-bold uppercase tracking-wider text-right" style={{ color: T.dim }}>
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: `${T.line}40` }}>
                      {resumoAtividades.map((a) => (
                        <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-6 rounded-full shrink-0" style={{ background: a.cor }} />
                              <span className="font-bold truncate max-w-[200px]" style={{ color: T.text }}>
                                {a.nome}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center" style={{ color: T.muted }}>
                            {a.torreNome}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-bold" style={{ ...NUM, color: a.avanco === 100 ? OK : ORANGE }}>
                                {a.avanco}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold" style={{ ...NUM, color: T.text }}>
                            {a.totalHomens > 0 ? (
                              <span className="px-2 py-0.5 rounded-md text-white font-black" style={{ background: ORANGE }}>
                                {a.totalHomens} {a.totalHomens === 1 ? "homem" : "homens"}
                              </span>
                            ) : (
                              <span style={{ color: T.dim }}>—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              {a.cargos.slice(0, 3).map((c) => (
                                <span
                                  key={c.cargo}
                                  className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1"
                                  style={{ background: `${c.cor}20`, color: c.cor }}
                                >
                                  {c.qtd} {c.cargo}
                                </span>
                              ))}
                              {a.cargos.length > 3 && (
                                <span className="text-[10px]" style={{ color: T.dim }}>
                                  +{a.cargos.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            {onSelectAtividade && (
                              <button
                                onClick={() => onSelectAtividade(a.id)}
                                className="text-[11px] px-2 py-1 rounded hover:bg-white/10 text-orange-400 font-semibold transition-colors cursor-pointer"
                              >
                                Ver no Gráfico
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Composição Percentual por Cargo (1 Coluna) */}
              <div
                className="p-4 rounded-2xl border shadow-xs flex flex-col justify-between"
                style={{ background: T.panel, borderColor: T.line }}
              >
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-1" style={{ color: T.text }}>
                    <Users size={16} style={{ color: "#38BDF8" }} />
                    Composição do Efetivo
                  </h3>
                  <p className="text-xs mb-3" style={{ color: T.muted }}>
                    Proporção de cada especialidade no projeto.
                  </p>

                  <div className="space-y-3">
                    {cargosPresentes.map((c) => {
                      const pct = metricas.totalHomensDia > 0
                        ? Math.round((c.totalHomens / metricas.totalHomensDia) * 100)
                        : 0;

                      return (
                        <div key={c.nome} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold flex items-center gap-1.5" style={{ color: T.text }}>
                              <span className="w-2 h-2 rounded-full" style={{ background: c.cor }} />
                              {c.nome}
                            </span>
                            <span className="font-bold" style={{ ...NUM, color: T.muted }}>
                              {c.totalHomens} {c.totalHomens === 1 ? "homem" : "homens"} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%`, background: c.cor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="p-3 rounded-xl border mt-4 text-xs"
                  style={{ background: T.raised, borderColor: T.line }}
                >
                  <span className="font-bold block mb-1" style={{ color: T.text }}>
                    💡 Dica de Engenharia
                  </span>
                  <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>
                    Mantenha o histograma balanceado para evitar picos abruptos de contratação e desmobilização de pessoal.
                  </p>
                </div>
              </div>
            </div>

            {/* ── 3. EXTRATO HISTÓRICO COMPLETO DE APONTAMENTOS DE AVANÇO ── */}
            <div
              className="p-4 sm:p-5 rounded-2xl border shadow-xs"
              style={{ background: T.panel, borderColor: T.line }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: T.text }}>
                    <Clock size={16} style={{ color: ORANGE }} />
                    Extrato Histórico de Apontamentos (Auditável no Supabase)
                  </h3>
                  <p className="text-xs" style={{ color: T.muted }}>
                    Registros detalhados de cada avanço físico com data, delta concluído, equipe e responsável.
                  </p>
                </div>

                <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: T.raised, color: T.text, ...NUM }}>
                  {apontamentosFiltrados.length} apontamentos encontrados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b" style={{ borderColor: T.line }}>
                      <th className="py-2 px-2 font-bold uppercase tracking-wider" style={{ color: T.dim }}>
                        Data
                      </th>
                      <th className="py-2 px-2 font-bold uppercase tracking-wider" style={{ color: T.dim }}>
                        Torre & Atividade
                      </th>
                      <th className="py-2 px-2 font-bold uppercase tracking-wider" style={{ color: T.dim }}>
                        Frente / Pavimento
                      </th>
                      <th className="py-2 px-2 font-bold uppercase tracking-wider text-center" style={{ color: T.dim }}>
                        Evolução Física
                      </th>
                      <th className="py-2 px-2 font-bold uppercase tracking-wider text-center" style={{ color: T.dim }}>
                        Total Homens
                      </th>
                      <th className="py-2 px-2 font-bold uppercase tracking-wider" style={{ color: T.dim }}>
                        Equipe / Cargos
                      </th>
                      <th className="py-2 px-2 font-bold uppercase tracking-wider" style={{ color: T.dim }}>
                        Observação / Responsável
                      </th>
                      <th className="py-2 px-2 font-bold uppercase tracking-wider text-right" style={{ color: T.dim }}>
                        Excluir
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: `${T.line}40` }}>
                    {apontamentosFiltrados.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-2 font-bold" style={{ ...NUM, color: T.text }}>
                          {fmtBR(D(item.data))}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="font-bold block" style={{ color: T.text }}>
                            {item.atividadeNome}
                          </span>
                          <span className="text-[10.5px]" style={{ color: T.muted }}>
                            {item.torreNome}
                          </span>
                        </td>
                        <td className="py-2.5 px-2" style={{ color: T.muted }}>
                          {item.pavimentoNome || "Frente geral"}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-[11px]" style={{ ...NUM }}>
                            <span style={{ color: T.muted }}>{item.avancoAnterior}%</span>
                            <span style={{ color: ORANGE }}>➔</span>
                            <span style={{ color: OK }}>{item.avancoNovo}%</span>
                            {item.deltaAvanco > 0 && (
                              <span className="text-emerald-400 font-semibold text-[10px]">
                                (+{item.deltaAvanco}%)
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-black px-2 py-0.5 rounded text-white" style={{ background: ORANGE, ...NUM }}>
                            {item.homensTotal}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            {(item.cargos || []).map((c) => (
                              <span
                                key={c.cargo}
                                className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                                style={{ background: `${getCargoCor(c.cargo)}20`, color: getCargoCor(c.cargo) }}
                              >
                                {c.quantidade} {c.cargo}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          {item.observacao && (
                            <span className="block text-[11px] text-white/80 italic mb-0.5">
                              "{item.observacao}"
                            </span>
                          )}
                          <span className="text-[10px]" style={{ color: T.dim }}>
                            Gravado por: {item.userNome || "Usuário"}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            onClick={() => excluirApontamento(item)}
                            className="p-1 hover:text-red-400 text-white/30 rounded transition-colors cursor-pointer"
                            title="Remover este apontamento"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      </div>

      {/* ── Overlay Central: Em Desenvolvimento para nível Admin ── */}
      {bloqueadoAdmin && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center select-none"
          style={{
            background: T.scheme === "dark" ? "rgba(17, 19, 16, 0.65)" : "rgba(236, 237, 235, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <div
            className="p-8 sm:p-10 rounded-3xl max-w-md w-full flex flex-col items-center gap-4 shadow-2xl transition-all"
            style={{
              background: T.panel,
              border: `1px solid ${T.line}`,
              boxShadow:
                T.scheme === "dark"
                  ? "0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 40px rgba(254, 80, 0, 0.12)"
                  : "0 25px 50px -12px rgba(0, 0, 0, 0.18), 0 0 40px rgba(254, 80, 0, 0.08)",
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md relative"
              style={{
                background: "linear-gradient(135deg, rgba(254, 80, 0, 0.15) 0%, rgba(254, 80, 0, 0.05) 100%)",
                border: "1px solid rgba(254, 80, 0, 0.3)",
              }}
            >
              <Construction size={32} style={{ color: "#FE5000" }} />
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <span
                className="text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full"
                style={{
                  background: "rgba(245, 158, 11, 0.18)",
                  color: "#D97706",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                }}
              >
                Em Breve
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1" style={{ color: T.text }}>
                Em Desenvolvimento
              </h2>
              <p className="text-xs sm:text-sm text-center leading-relaxed mt-1" style={{ color: T.muted }}>
                O módulo de <strong>Histograma de Mão de Obra</strong> está em desenvolvimento para o perfil Administrador e será liberado em breve.
              </p>
            </div>

            {onVoltarAoGrafico && (
              <button
                onClick={onVoltarAoGrafico}
                className="mt-2 w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md hover:brightness-110 active:scale-[0.99] cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #FE5000 0%, #E04600 100%)",
                  boxShadow: "0 4px 14px rgba(254, 80, 0, 0.28)",
                }}
              >
                Voltar ao Gráfico TxC
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
