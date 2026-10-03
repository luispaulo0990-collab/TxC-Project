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
} from "lucide-react";
import * as XLSX from "xlsx";
import { ORANGE, OK, ERRO, NUM, FONT } from "../../constants/theme";
import { D, iso, hoje, fmtBR, diffDays, addDays } from "../../utils/dateUtils";
import { normalizar } from "../../utils/geometryUtils";
import { baixar } from "../../utils/exportUtils";
import { CARGOS_PADRAO, getCargoCor, PALETA_CARGOS } from "../../constants/cargos";
import { apiClient } from "../../utils/apiClient";

export const HistogramaView = ({
  T,
  proj,
  setProj,
  filtroTorre: filtroTorreInicial = "TODAS",
  onAbrirModalApontar,
  onSelectAtividade,
  flash,
  user,
}) => {
  const [filtroTorre, setFiltroTorre] = useState(filtroTorreInicial);
  const [buscaAtividade, setBuscaAtividade] = useState("");
  const [cargoFiltro, setCargoFiltro] = useState("TODOS");
  const [granularidade, setGranularidade] = useState("diario"); // "diario" | "semanal" | "mensal"
  const [tipoGrafico, setTipoGrafico] = useState("empilhado"); // "empilhado" | "acumulado"
  const [cargosOcultos, setCargosOcultos] = useState(new Set());
  const [tooltipInfo, setTooltipInfo] = useState(null);

  // Período de análise (por padrão, últimos 30 dias até +15 dias futuros ou período das atividades)
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 25);
    return iso(d);
  });
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return iso(d);
  });

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
    if (!apontamentosFiltrados.length) return [];

    // Determinar range de datas
    let minD = dataInicio ? D(dataInicio) : null;
    let maxD = dataFim ? D(dataFim) : null;

    apontamentosFiltrados.forEach((ap) => {
      if (!ap.data) return;
      const d = D(ap.data);
      if (!minD || d < minD) minD = d;
      if (!maxD || d > maxD) maxD = d;
    });

    if (!minD || !maxD) {
      minD = new Date();
      maxD = addDays(minD, 14);
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
      const chave = getChaveBucket(d);

      if (!buckets.has(chave)) {
        let label = chave;
        if (granularidade === "diario") label = fmtBR(d);
        buckets.set(chave, {
          chave,
          dataLabel: label,
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
  }, [apontamentosFiltrados, dataInicio, dataFim, granularidade, cargosOcultos]);

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
      cargoTop: cargoTop ? `${cargoTop.nome} (${cargoTop.totalHomens} h-d)` : "Nenhum",
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
        "Total Homem-Dia": c.totalHomens,
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
        "Total Homens-Dia": a.totalHomens,
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

  // Cálculo de Escala do Gráfico
  const maxGrafico = useMemo(() => {
    if (tipoGrafico === "acumulado") {
      const maxAcc = Math.max(...dadosGrafico.map((d) => d.totalAcumulado), 10);
      return Math.ceil(maxAcc * 1.15);
    }
    const maxVal = Math.max(...dadosGrafico.map((d) => d.total), 5);
    return Math.ceil(maxVal * 1.25);
  }, [dadosGrafico, tipoGrafico]);

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden"
      style={{ background: T.bg, fontFamily: FONT, color: T.text }}
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
            {onAbrirModalApontar && (
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

          {/* Card 3: Homens-Dia Totais */}
          <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: T.raised, borderColor: T.line }}>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: T.dim }}>
              Esforço Total
            </span>
            <div className="mt-1">
              <span className="text-xl font-black" style={{ ...NUM, color: "#38BDF8" }}>
                {metricas.totalHomensDia}
              </span>
              <span className="text-xs ml-1 font-semibold" style={{ color: T.muted }}>
                homens-dia
              </span>
            </div>
            <span className="text-[10.5px]" style={{ color: T.muted }}>
              Volume de trabalho
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

          {/* Tipo de Visualização */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: T.line }}>
            <button
              onClick={() => setTipoGrafico("empilhado")}
              className="px-2.5 py-1.5 transition-colors font-semibold flex items-center gap-1"
              style={{
                background: tipoGrafico === "empilhado" ? OK : T.raised,
                color: tipoGrafico === "empilhado" ? "#ffffff" : T.muted,
              }}
            >
              <BarChart3 size={13} /> Histograma
            </button>
            <button
              onClick={() => setTipoGrafico("acumulado")}
              className="px-2.5 py-1.5 transition-colors font-semibold flex items-center gap-1"
              style={{
                background: tipoGrafico === "acumulado" ? OK : T.raised,
                color: tipoGrafico === "acumulado" ? "#ffffff" : T.muted,
              }}
            >
              <TrendingUp size={13} /> Curva S (Acumulado)
            </button>
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
                {c.nome} ({c.totalHomens} h-d)
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
            {/* ── 1. GRÁFICO PRINCIPAL DE HISTOGRAMA / CURVA S ── */}
            <div
              className="p-4 sm:p-5 rounded-2xl border shadow-xs"
              style={{ background: T.panel, borderColor: T.line }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: T.text }}>
                    <BarChart3 size={16} style={{ color: ORANGE }} />
                    {tipoGrafico === "empilhado"
                      ? "Distribuição Temporal de Homens por Cargo"
                      : "Curva S Cumulativa de Homens-Dia"}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                    Passe o cursor sobre as barras para inspecionar os cargos e atividades daquele período.
                  </p>
                </div>

                {/* Tag de Pico */}
                <div
                  className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  style={{ background: `${ORANGE}18`, color: ORANGE, border: `1px solid ${ORANGE}30` }}
                >
                  <TrendingUp size={13} />
                  Pico Máximo: {metricas.picoHomens} homens ({metricas.picoData})
                </div>
              </div>

              {/* Área do Gráfico SVG Interativo */}
              <div className="relative w-full h-72 sm:h-80 select-none">
                {dadosGrafico.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs" style={{ color: T.muted }}>
                    Nenhum dado encontrado para o filtro aplicado.
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col justify-between">
                    {/* Linhas de Grade e Barras */}
                    <div className="flex-1 relative flex items-end gap-1.5 sm:gap-2 px-6 pt-4 pb-2 border-b border-l" style={{ borderColor: T.line }}>
                      {/* Linhas horizontais de referência */}
                      {[0.25, 0.5, 0.75, 1].map((pct) => {
                        const val = Math.round(maxGrafico * pct);
                        return (
                          <div
                            key={pct}
                            className="absolute left-0 right-0 border-t border-dashed pointer-events-none flex items-center"
                            style={{
                              bottom: `${pct * 100}%`,
                              borderColor: `${T.line}40`,
                            }}
                          >
                            <span
                              className="absolute -left-6 text-[9.5px] font-bold"
                              style={{ color: T.dim, ...NUM }}
                            >
                              {val}
                            </span>
                          </div>
                        );
                      })}

                      {/* Renderização de Barras */}
                      {dadosGrafico.map((d, idx) => {
                        const valExibicao = tipoGrafico === "acumulado" ? d.totalAcumulado : d.total;
                        const alturaPct = maxGrafico > 0 ? Math.min(100, (valExibicao / maxGrafico) * 100) : 0;
                        const isPico = d.total === metricas.picoHomens && metricas.picoHomens > 0;

                        return (
                          <div
                            key={d.chave || idx}
                            className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                            onMouseEnter={() => setTooltipInfo(d)}
                            onMouseLeave={() => setTooltipInfo(null)}
                          >
                            {/* Pin do Pico */}
                            {isPico && tipoGrafico === "empilhado" && (
                              <div className="absolute -top-3.5 flex flex-col items-center z-10 animate-bounce">
                                <span
                                  className="text-[9px] px-1 py-0.5 rounded font-black text-white shadow-xs"
                                  style={{ background: ORANGE }}
                                >
                                  {d.total}
                                </span>
                              </div>
                            )}

                            {/* Barra Empilhada */}
                            <div
                              className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse transition-all group-hover:brightness-125 shadow-xs"
                              style={{
                                height: `${Math.max(2, alturaPct)}%`,
                                minHeight: d.total > 0 ? 4 : 0,
                                background: tipoGrafico === "acumulado" ? "linear-gradient(180deg, #10B981 0%, #065F46 100%)" : undefined,
                              }}
                            >
                              {tipoGrafico === "empilhado" &&
                                Object.entries(d.porCargo).map(([cNome, cQtd]) => {
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

                            {/* Label do Eixo X */}
                            <div
                              className="text-[9.5px] truncate w-full text-center mt-2 group-hover:font-bold transition-all"
                              style={{ color: T.dim }}
                            >
                              {d.dataLabel}
                            </div>
                          </div>
                        );
                      })}
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
                      Histórico acumulado de homens-dia aplicados em cada atividade da torre.
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
                          Homens-Dia
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
                                {a.totalHomens} h-d
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
                              {c.totalHomens} h-d ({pct}%)
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
  );
};
