import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Search,
  Filter,
  Download,
  Upload,
  Calendar,
  Building2,
  ChevronRight,
  ArrowUpRight,
  FileSpreadsheet,
  RotateCcw,
  Zap,
} from "lucide-react";
import * as XLSX from "xlsx";
import { ORANGE, ERRO, OK, FONT, NUM } from "../../constants/theme";
import { D, iso, addDays, fmtBR, hoje, diffDays } from "../../utils/dateUtils";
import { normalizar } from "../../utils/geometryUtils";
import { baixar } from "../../utils/exportUtils";
import { exportarModeloAvanco } from "../../utils/importUtils";
import { calcularStatusAtividade } from "../../utils/statusUtils";

export const AvancoView = ({
  T,
  proj,
  setProj,
  rows,
  rowIdx,
  onVoltarGrafico,
  onSelectAtividade,
  onAbrirImport,
  flash,
}) => {
  const [filtroTorre, setFiltroTorre] = useState("TODAS");
  const [filtroStatus, setFiltroStatus] = useState("TODAS"); // TODAS | EM_ANDAMENTO | CONCLUIDAS | NAO_INICIADAS | ATRASADAS
  const [busca, setBusca] = useState("");
  const [dataCorteStr, setDataCorteStr] = useState(() => iso(hoje()));
  const [ordenacao, setOrdenacao] = useState("padrao"); // padrao | nome | avanco_asc | avanco_desc | inicio

  // Lista de atividades com status enriquecido conforme o corte da linha Hoje
  const atividadesCalculadas = useMemo(() => {
    if (!proj || !proj.atividades) return [];

    return proj.atividades.map((a) => {
      const calc = calcularStatusAtividade(a, proj, rowIdx, dataCorteStr);
      const torre = proj.torres?.find((t) => t.id === a.torreId);
      const locIni = proj.locais?.find((l) => l.id === a.locIniId);
      const locFim = proj.locais?.find((l) => l.id === a.locFimId);

      return {
        ...a,
        ...calc,
        torreNome: torre?.nome || "Torre",
        locIniNome: locIni?.nome || "Início",
        locFimNome: locFim?.nome || "Fim",
      };
    });
  }, [proj, rowIdx, dataCorteStr]);

  // Filtros aplicados
  const atividadesFiltradas = useMemo(() => {
    return atividadesCalculadas.filter((a) => {
      if (filtroTorre !== "TODAS" && a.torreId !== filtroTorre) return false;
      if (filtroStatus === "EM_ANDAMENTO" && a.status !== "EM_ANDAMENTO") return false;
      if (filtroStatus === "CONCLUIDAS" && a.status !== "CONCLUIDA") return false;
      if (filtroStatus === "NAO_INICIADAS" && a.status !== "NAO_INICIADA") return false;
      if (filtroStatus === "ATRASADAS" && a.status !== "ATRASADA") return false;
      if (busca) {
        const q = normalizar(busca);
        const matchNome = normalizar(a.nome).includes(q);
        const matchTorre = normalizar(a.torreNome).includes(q);
        if (!matchNome && !matchTorre) return false;
      }
      return true;
    }).sort((a, b) => {
      if (ordenacao === "avanco_asc") return a.avanco - b.avanco;
      if (ordenacao === "avanco_desc") return b.avanco - a.avanco;
      if (ordenacao === "nome") return a.nome.localeCompare(b.nome);
      if (ordenacao === "inicio") return D(a.dataIni) - D(b.dataIni);
      return 0;
    });
  }, [atividadesCalculadas, filtroTorre, filtroStatus, busca, ordenacao]);

  // Estatísticas Globais
  const estatisticas = useMemo(() => {
    const total = atividadesCalculadas.length;
    if (!total) return { total: 0, mediaAvanco: 0, concluidas: 0, emAndamento: 0, atrasadas: 0, naoIniciadas: 0 };

    const concluidas = atividadesCalculadas.filter((a) => a.status === "CONCLUIDA").length;
    const emAndamento = atividadesCalculadas.filter((a) => a.status === "EM_ANDAMENTO").length;
    const atrasadas = atividadesCalculadas.filter((a) => a.status === "ATRASADA").length;
    const naoIniciadas = atividadesCalculadas.filter((a) => a.status === "NAO_INICIADA").length;
    const somaAvancos = atividadesCalculadas.reduce((acc, a) => acc + a.avanco, 0);
    const mediaAvanco = Math.round(somaAvancos / total);

    return {
      total,
      mediaAvanco,
      concluidas,
      emAndamento,
      atrasadas,
      naoIniciadas,
    };
  }, [atividadesCalculadas]);

  // Atualizador pontual de atividade
  const atualizarAtividade = (id, patch) => {
    setProj((p) => ({
      ...p,
      atividades: p.atividades.map((a) => {
        if (a.id !== id) return a;
        const upd = { ...a, ...patch };

        // Sincronizar datas reais e avanço
        if (patch.avanco != null) {
          const num = Number(patch.avanco);
          if (num === 100 && !upd.realFim) {
            upd.realFim = iso(D(dataCorteStr));
          } else if (num > 0 && !upd.realIni) {
            upd.realIni = iso(D(dataCorteStr));
          } else if (num === 0) {
            upd.realIni = null;
            upd.realFim = null;
          }
        }
        return upd;
      }),
    }));
  };

  // Exportar Relatório de Avanço em Excel (.xlsx)
  const exportarRelatorioAvancoExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const dados = atividadesCalculadas.map((a) => ({
        "Empreendimento": proj.nome,
        "Torre": a.torreNome,
        "Atividade": a.nome,
        "Status": a.status === "CONCLUIDA" ? "Concluída" : a.status === "EM_ANDAMENTO" ? "Em Andamento" : a.status === "ATRASADA" ? "Atrasada" : "Não Iniciada",
        "% Avanço Realizado": `${a.avanco}%`,
        "Pavimento Atual": a.pavAtualNome || "—",
        "Pavimentos Executados": a.pavsConcluidos,
        "Corte Linha Hoje (Pav Previsto)": a.pavCorteNome || (a.pavsPrevistosCorte ? `${a.pavsPrevistosCorte}º pav` : "—"),
        "Corte Linha Hoje (% Previsto)": `${a.pctPrevistoCorte}%`,
        "Diferença em Pavimentos": a.corteHojeAtivo ? (a.diferencaPavs >= 0 ? `+${a.diferencaPavs}` : `${a.diferencaPavs}`) : "—",
        "Diferença em %": a.corteHojeAtivo ? (a.diferencaPct >= 0 ? `+${a.diferencaPct}%` : `${a.diferencaPct}%`) : "—",
        "Pavimentos Totais": a.totalPavs,
        "Data Início (Planejada)": fmtBR(D(a.dataIni)),
        "Data Término (Planejada)": fmtBR(D(a.dataFim)),
        "Data Início (Real)": a.realIni ? fmtBR(D(a.realIni)) : "—",
        "Data Término (Real)": a.realFim ? fmtBR(D(a.realFim)) : "—",
      }));

      const ws = XLSX.utils.json_to_sheet(dados);
      ws["!cols"] = [
        { wch: 25 },
        { wch: 18 },
        { wch: 35 },
        { wch: 16 },
        { wch: 18 },
        { wch: 20 },
        { wch: 20 },
        { wch: 28 },
        { wch: 24 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Avanço Físico das Atividades");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const nomeBase = (proj.nome || "avanco-obras").replace(/[\/\\:*?"<>|]/g, "-");
      baixar(`relatorio-avanco-${nomeBase}.xlsx`, wbout, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", flash);
      if (flash) flash("Relatório de avanço exportado em Excel (.xlsx)");
    } catch (e) {
      if (flash) flash("Erro ao exportar relatório de avanço");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: T.bg, fontFamily: FONT, color: T.text }}>
      {/* ── Topo do Painel de Avanço ── */}
      <div className="p-4 shrink-0 border-b flex flex-col gap-4" style={{ background: T.panel, borderColor: T.line }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded flex items-center justify-center font-bold text-white shadow-sm" style={{ background: OK }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold flex items-center gap-2" style={{ color: T.text }}>
                Apontamento de Avanço Físico
              </h1>
              <p className="text-xs" style={{ color: T.muted }}>
                Monitore o progresso real das atividades. Todas as atualizações refletem imediatamente no gráfico Tempo x Caminho.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAbrirImport("avanco")}
              className="text-xs px-3 py-1.5 rounded flex items-center gap-1.5 font-semibold transition-colors border shadow-xs hover:brightness-95"
              style={{ background: T.raised, borderColor: T.line, color: T.text }}
            >
              <Upload size={13} style={{ color: OK }} /> Importar Avanço (.xlsx)
            </button>
            <button
              onClick={() => exportarModeloAvanco({ proj, torreId: filtroTorre, flash })}
              className="text-xs px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors border hover:bg-black/5"
              style={{ background: T.raised, borderColor: T.line, color: T.muted }}
              title="Baixar modelo de planilha para preenchimento de avanço"
            >
              <FileSpreadsheet size={13} /> Modelo
            </button>
            <button
              onClick={exportarRelatorioAvancoExcel}
              className="text-xs px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition-all hover:brightness-110 text-white shadow-xs"
              style={{ background: "#1D6F42" }}
            >
              <Download size={13} /> Exportar Excel (.xlsx)
            </button>
          </div>
        </div>

        {/* ── Cards de Indicadores Globais ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Card 1: % Médio */}
          <div className="p-3 rounded-sm border flex flex-col justify-between" style={{ background: T.raised, borderColor: T.line }}>
            <span className="text-[10.5px] uppercase font-bold tracking-wider" style={{ color: T.dim }}>
              Avanço Geral
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black" style={{ ...NUM, color: OK }}>
                {estatisticas.mediaAvanco}%
              </span>
              <span className="text-xs" style={{ color: T.muted }}>
                {estatisticas.total} ativ.
              </span>
            </div>
            <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="h-full rounded-full transition-all" style={{ width: `${estatisticas.mediaAvanco}%`, background: OK }} />
            </div>
          </div>

          {/* Card 2: Concluídas */}
          <div
            onClick={() => setFiltroStatus(filtroStatus === "CONCLUIDAS" ? "TODAS" : "CONCLUIDAS")}
            className="p-3 rounded-sm border cursor-pointer transition-all hover:brightness-95 flex flex-col justify-between"
            style={{
              background: filtroStatus === "CONCLUIDAS" ? `${OK}15` : T.raised,
              borderColor: filtroStatus === "CONCLUIDAS" ? OK : T.line,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] uppercase font-bold tracking-wider" style={{ color: OK }}>
                Concluídas
              </span>
              <CheckCircle2 size={13} style={{ color: OK }} />
            </div>
            <span className="text-xl font-black mt-1" style={{ ...NUM, color: T.text }}>
              {estatisticas.concluidas}
            </span>
            <span className="text-[10px]" style={{ color: T.muted }}>
              100% executadas
            </span>
          </div>

          {/* Card 3: Em Andamento */}
          <div
            onClick={() => setFiltroStatus(filtroStatus === "EM_ANDAMENTO" ? "TODAS" : "EM_ANDAMENTO")}
            className="p-3 rounded-sm border cursor-pointer transition-all hover:brightness-95 flex flex-col justify-between"
            style={{
              background: filtroStatus === "EM_ANDAMENTO" ? `${ORANGE}15` : T.raised,
              borderColor: filtroStatus === "EM_ANDAMENTO" ? ORANGE : T.line,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] uppercase font-bold tracking-wider" style={{ color: ORANGE }}>
                Em Andamento
              </span>
              <Clock size={13} style={{ color: ORANGE }} />
            </div>
            <span className="text-xl font-black mt-1" style={{ ...NUM, color: T.text }}>
              {estatisticas.emAndamento}
            </span>
            <span className="text-[10px]" style={{ color: T.muted }}>
              Frentes ativas
            </span>
          </div>

          {/* Card 4: Com Atraso */}
          <div
            onClick={() => setFiltroStatus(filtroStatus === "ATRASADAS" ? "TODAS" : "ATRASADAS")}
            className="p-3 rounded-sm border cursor-pointer transition-all hover:brightness-95 flex flex-col justify-between"
            style={{
              background: filtroStatus === "ATRASADAS" ? `${ERRO}15` : T.raised,
              borderColor: filtroStatus === "ATRASADAS" ? ERRO : T.line,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] uppercase font-bold tracking-wider" style={{ color: ERRO }}>
                Atrasadas
              </span>
              <AlertTriangle size={13} style={{ color: ERRO }} />
            </div>
            <span className="text-xl font-black mt-1" style={{ ...NUM, color: ERRO }}>
              {estatisticas.atrasadas}
            </span>
            <span className="text-[10px]" style={{ color: ERRO }}>
              Abaixo da linha Hoje
            </span>
          </div>

          {/* Card 5: Não Iniciadas */}
          <div
            onClick={() => setFiltroStatus(filtroStatus === "NAO_INICIADAS" ? "TODAS" : "NAO_INICIADAS")}
            className="p-3 rounded-sm border cursor-pointer transition-all hover:brightness-95 flex flex-col justify-between"
            style={{
              background: filtroStatus === "NAO_INICIADAS" ? `${T.dim}20` : T.raised,
              borderColor: filtroStatus === "NAO_INICIADAS" ? T.dim : T.line,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] uppercase font-bold tracking-wider" style={{ color: T.dim }}>
                Não Iniciadas
              </span>
              <Layers size={13} style={{ color: T.dim }} />
            </div>
            <span className="text-xl font-black mt-1" style={{ ...NUM, color: T.text }}>
              {estatisticas.naoIniciadas}
            </span>
            <span className="text-[10px]" style={{ color: T.muted }}>
              Aguardando início
            </span>
          </div>

          {/* Card 6: Data de Medição */}
          <div className="p-3 rounded-sm border flex flex-col justify-between" style={{ background: T.raised, borderColor: T.line }}>
            <span className="text-[10.5px] uppercase font-bold tracking-wider flex items-center gap-1" style={{ color: T.dim }}>
              <Calendar size={11} /> Data de Corte
            </span>
            <input
              type="date"
              value={dataCorteStr}
              onChange={(e) => setDataCorteStr(e.target.value)}
              className="text-xs px-1.5 py-1 rounded bg-transparent outline-none font-bold mt-1"
              style={{ ...NUM, border: `1px solid ${T.line}`, color: T.text, colorScheme: T.scheme }}
            />
            <span className="text-[10px]" style={{ color: T.muted }}>
              Data base para medição
            </span>
          </div>
        </div>

        {/* ── Barra de Filtros e Busca ── */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {/* Torre */}
          <div className="flex items-center gap-1.5 text-xs">
            <Building2 size={14} style={{ color: T.dim }} />
            <select
              value={filtroTorre}
              onChange={(e) => setFiltroTorre(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded outline-none border font-medium"
              style={{ background: T.input, borderColor: T.line, color: T.text }}
            >
              <option value="TODAS">Todas as torres</option>
              {proj.torres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex rounded overflow-hidden border text-xs" style={{ borderColor: T.line }}>
            {[
              ["TODAS", "Todas"],
              ["EM_ANDAMENTO", "Em Andamento"],
              ["CONCLUIDAS", "Concluídas"],
              ["ATRASADAS", "Atrasadas"],
              ["NAO_INICIADAS", "Não Iniciadas"],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFiltroStatus(k)}
                className="px-2.5 py-1.5 transition-colors font-medium text-xs"
                style={{
                  background: filtroStatus === k ? (k === "ATRASADAS" ? ERRO : k === "CONCLUIDAS" ? OK : ORANGE) : T.raised,
                  color: filtroStatus === k ? "#ffffff" : T.muted,
                  fontWeight: filtroStatus === k ? 700 : 400,
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.dim }} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar atividade..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded outline-none border"
              style={{ background: T.input, borderColor: T.line, color: T.text }}
            />
          </div>

          {/* Ordenação */}
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded outline-none border font-medium"
            style={{ background: T.input, borderColor: T.line, color: T.text }}
          >
            <option value="padrao">Ordem Padrão</option>
            <option value="avanco_desc">Maior Avanço (%)</option>
            <option value="avanco_asc">Menor Avanço (%)</option>
            <option value="inicio">Data de Início</option>
            <option value="nome">Nome A-Z</option>
          </select>
        </div>
      </div>

      {/* ── Lista de Atividades para Apontamento ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {atividadesFiltradas.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
            <Layers size={36} style={{ color: T.dim }} />
            <span className="text-sm font-bold" style={{ color: T.text }}>
              Nenhuma atividade encontrada
            </span>
            <span className="text-xs" style={{ color: T.muted }}>
              Tente ajustar os filtros ou importar a lista de atividades para a torre.
            </span>
          </div>
        ) : (
          atividadesFiltradas.map((a) => {
            const locaisTorre = proj.locais
              .filter((l) => l.torreId === a.torreId)
              .sort((x, y) => x.ordem - y.ordem);

            const statusCor =
              a.status === "CONCLUIDA"
                ? OK
                : a.status === "ATRASADA"
                ? ERRO
                : a.status === "EM_ANDAMENTO"
                ? ORANGE
                : T.dim;

            const statusTexto =
              a.status === "CONCLUIDA"
                ? "Concluída"
                : a.status === "ATRASADA"
                ? "Atrasada"
                : a.status === "EM_ANDAMENTO"
                ? "Em Andamento"
                : "Não Iniciada";

            return (
              <div
                key={a.id}
                className="p-4 rounded-sm border transition-all hover:shadow-sm"
                style={{ background: T.panel, borderColor: T.line }}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  {/* Identificação da Atividade */}
                  <div className="flex items-center gap-2.5 min-w-[240px]">
                    <div className="w-1.5 h-10 rounded-full" style={{ background: a.cor }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: T.text }}>
                          {a.nome}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                          style={{ background: `${statusCor}20`, color: statusCor }}
                        >
                          {statusTexto}
                        </span>
                      </div>
                      <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: T.muted }}>
                        <span>{a.torreNome}</span>
                        <span>•</span>
                        <span>
                          {a.locIniNome} ➔ {a.locFimNome} ({a.totalPavs} pavs)
                        </span>
                        <span>•</span>
                        <span>
                          Plan: {fmtBR(D(a.dataIni))} a {fmtBR(D(a.dataFim))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações Rápidas de Percentual */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[0, 25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => atualizarAtividade(a.id, { avanco: pct })}
                        className="text-xs px-2.5 py-1 rounded font-bold transition-all hover:scale-105"
                        style={{
                          ...NUM,
                          background: a.avanco === pct ? (pct === 100 ? OK : ORANGE) : T.raised,
                          color: a.avanco === pct ? "#ffffff" : T.text,
                          border: `1px solid ${a.avanco === pct ? "transparent" : T.line}`,
                        }}
                      >
                        {pct}%
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const prox = Math.min(100, Math.round(a.avanco + (100 / Math.max(1, a.totalPavs))));
                        atualizarAtividade(a.id, { avanco: prox });
                      }}
                      className="text-xs px-2.5 py-1 rounded font-bold transition-all border flex items-center gap-1 hover:brightness-95"
                      style={{ background: T.raised, borderColor: T.line, color: ORANGE }}
                      title="Avançar 1 pavimento no progresso"
                    >
                      <ArrowUpRight size={12} /> +1 Pav
                    </button>

                    {onSelectAtividade && (
                      <button
                        type="button"
                        onClick={() => onSelectAtividade(a.id)}
                        className="text-xs px-2 py-1 rounded text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-0.5"
                        title="Localizar e focar no gráfico"
                      >
                        Ver no Gráfico <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Barra de Progresso Físico Interativa */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2" style={{ ...NUM }}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span style={{ color: T.dim, fontSize: 11 }}>
                        Progresso Realizado:
                      </span>
                      <span className="font-bold text-sm" style={{ color: statusCor }}>
                        {a.avanco}%
                      </span>
                      <span style={{ color: T.muted, fontSize: 11 }}>
                        ({a.pavsConcluidos} de {a.totalPavs} pavs · {a.pavAtualNome || "—"})
                      </span>
                    </div>

                    {/* Comparação com o corte da Linha de Hoje */}
                    <div className="flex items-center gap-2">
                      {a.corteHojeAtivo ? (
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1"
                          style={{
                            background: a.emAtraso ? `${ERRO}18` : `${OK}18`,
                            color: a.emAtraso ? ERRO : OK,
                            border: `1px solid ${a.emAtraso ? ERRO : OK}40`,
                          }}
                        >
                          {a.emAtraso ? (
                            <>
                              <AlertTriangle size={11} />
                              Atraso: {Math.abs(a.diferencaPavs)} pav ({Math.abs(a.diferencaPct)}%) vs Corte Hoje ({a.pavCorteNome || a.pavsPrevistosCorte + "º pav"})
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={11} />
                              Em dia com Linha Hoje ({a.pavCorteNome || a.pavsPrevistosCorte + "º pav"})
                            </>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: T.dim, fontSize: 11 }}>
                          Início posterior à linha de corte
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Range Slider com Marcador Visual de Corte Hoje */}
                  <div className="relative flex items-center py-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={a.avanco}
                      onChange={(e) => atualizarAtividade(a.id, { avanco: Number(e.target.value) })}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 relative z-10"
                      style={{
                        background: `linear-gradient(to right, ${statusCor} 0%, ${statusCor} ${a.avanco}%, ${T.line} ${a.avanco}%, ${T.line} 100%)`,
                      }}
                    />

                    {/* Marcador vertical de onde a Linha Hoje corta a atividade */}
                    {a.corteHojeAtivo && (
                      <div
                        className="absolute pointer-events-none z-20 flex flex-col items-center"
                        style={{
                          left: `${Math.min(99, Math.max(1, a.pctPrevistoCorte))}%`,
                          transform: "translateX(-50%)",
                          top: -3,
                        }}
                        title={`Linha Hoje corta em ${a.pctPrevistoCorte}% (${a.pavCorteNome || a.pavsPrevistosCorte + "º pav"})`}
                      >
                        <span
                          className="w-2 h-2 rotate-45 rounded-[1px] shadow-sm"
                          style={{ background: ORANGE }}
                        />
                        <div
                          className="w-0.5 h-3.5"
                          style={{ background: ORANGE }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Campos Detalhados de Apontamento Realizado */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t" style={{ borderColor: T.line }}>
                  {/* Pavimento Atual Alcançado */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: T.dim }}>
                      Pavimento Atual / Frente de Trabalho:
                    </label>
                    <select
                      value={a.pavimentoAtualId || ""}
                      onChange={(e) => atualizarAtividade(a.id, { pavimentoAtualId: e.target.value || null })}
                      className="w-full text-xs px-2.5 py-1.5 rounded outline-none border"
                      style={{ background: T.input, borderColor: T.line, color: T.text }}
                    >
                      <option value="">Não informado (automático)</option>
                      {locaisTorre.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Início Real */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: T.dim }}>
                      Início Real (Efetivo):
                    </label>
                    <input
                      type="date"
                      value={a.realIni || ""}
                      onChange={(e) => atualizarAtividade(a.id, { realIni: e.target.value || null })}
                      className="w-full text-xs px-2 py-1.5 rounded outline-none border"
                      style={{ ...NUM, background: T.input, borderColor: T.line, color: T.text, colorScheme: T.scheme }}
                    />
                  </div>

                  {/* Término Real */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: T.dim }}>
                      Término Real (Conclusão):
                    </label>
                    <input
                      type="date"
                      value={a.realFim || ""}
                      onChange={(e) => atualizarAtividade(a.id, { realFim: e.target.value || null })}
                      className="w-full text-xs px-2 py-1.5 rounded outline-none border"
                      style={{ ...NUM, background: T.input, borderColor: T.line, color: T.text, colorScheme: T.scheme }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
