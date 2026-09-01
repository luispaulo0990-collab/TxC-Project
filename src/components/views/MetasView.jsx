import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  TrendingUp,
  Target,
  Layers,
  Search,
  Download,
  Building2,
  ChevronRight,
  FileSpreadsheet,
  FileCode,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import { LogoUnita } from "../common/LogoUnita";
import { Modal } from "../common/Modal";
import { ORANGE, ERRO, OK, FONT, NUM, THEME, DIAS_MES } from "../../constants/theme";
import { D, iso, addDays, fmtBR, hoje, diffDays } from "../../utils/dateUtils";
import { calcularMetasAtividades } from "../../utils/metasUtils";
import { baixar } from "../../utils/exportUtils";

export const MetasView = ({
  T,
  proj,
  rows,
  rowIdx,
  onVoltar,
  onSelectAtividade,
}) => {
  const [dataRefStr, setDataRefStr] = useState(() => iso(hoje()));
  const [tipoPeriodo, setTipoPeriodo] = useState("30d"); // 7d | 15d | 30d | mes_atual | prox_mes | saldo_total | custom
  const [customFimStr, setCustomFimStr] = useState(() => iso(addDays(hoje(), 30)));
  const [filtroTorre, setFiltroTorre] = useState("TODAS");
  const [filtroAtividade, setFiltroAtividade] = useState("TODAS");
  const [filtroStatus, setFiltroStatus] = useState("com_meta"); // com_meta | em_andamento | iniciar | todas
  const [busca, setBusca] = useState("");
  const [modoVisao, setModoVisao] = useState("cards"); // cards | tabela
  const [modalExportMetas, setModalExportMetas] = useState(false);

  // Cálculo da data fim com base no período selecionado
  const dataFimCalculada = useMemo(() => {
    const dRef = D(dataRefStr);
    if (tipoPeriodo === "7d") return addDays(dRef, 7);
    if (tipoPeriodo === "15d") return addDays(dRef, 15);
    if (tipoPeriodo === "30d") return addDays(dRef, 30);
    if (tipoPeriodo === "mes_atual") {
      return new Date(dRef.getFullYear(), dRef.getMonth() + 1, 0); // último dia do mês
    }
    if (tipoPeriodo === "prox_mes") {
      return new Date(dRef.getFullYear(), dRef.getMonth() + 2, 0);
    }
    if (tipoPeriodo === "saldo_total") {
      return addDays(dRef, 365);
    }
    return D(customFimStr);
  }, [dataRefStr, tipoPeriodo, customFimStr]);

  // Execução do cálculo de metas
  const dadosMetas = useMemo(() => {
    return calcularMetasAtividades({
      proj,
      rows,
      rowIdx,
      dataRef: dataRefStr,
      dataFimPeriodo: dataFimCalculada,
    });
  }, [proj, rows, rowIdx, dataRefStr, dataFimCalculada]);

  // Filtragem das atividades
  const atividadesFiltradas = useMemo(() => {
    return dadosMetas.todasAtividades.filter((a) => {
      if (filtroTorre !== "TODAS" && a.torreId !== filtroTorre) return false;
      if (filtroAtividade !== "TODAS" && a.id !== filtroAtividade) return false;
      if (busca && !a.nome.toLowerCase().includes(busca.toLowerCase())) return false;

      if (filtroStatus === "com_meta") return a.temMetaNoPeriodo;
      if (filtroStatus === "em_andamento") return a.estadoMeta === "em_andamento";
      if (filtroStatus === "iniciar") return a.estadoMeta === "iniciar_no_periodo";
      return true; // todas
    });
  }, [dadosMetas, filtroTorre, filtroAtividade, busca, filtroStatus]);

  // Exportar metas para múltiplos formatos (XLSX, XML, CSV)
  const exportarMetas = (formato = "xlsx") => {
    const dadosResumo = atividadesFiltradas.map((a) => ({
      "Atividade": a.nome,
      "Torre": a.torreNome,
      "Status no Período":
        a.estadoMeta === "em_andamento"
          ? "Em Execução"
          : a.estadoMeta === "iniciar_no_periodo"
          ? "Iniciar no Período"
          : a.estadoMeta === "concluida"
          ? "Concluída"
          : "Futura",
      "Pavimentos Meta (Qtd)": a.pavimentosNoPeriodo,
      "Pavimento Início Meta": a.pavIniPeriodoNome,
      "Pavimento Fim Meta": a.pavFimPeriodoNome,
      "Meta do Período (%)": `${a.percNoPeriodo}%`,
      "Concluído até Hoje (%)": `${a.percConcluidoAteHoje}%`,
      "Previsão Acumulada Final (%)": `${a.percAcumuladoFinalPeriodo}%`,
      "Saldo Futuro (%)": `${a.percSaldoFuturo}%`,
      "Início Previsto no Período": a.iniJanela ? fmtBR(a.iniJanela) : "—",
      "Término Previsto no Período": a.fimJanela ? fmtBR(a.fimJanela) : "—",
      "Velocidade (pav/mês)": a.modo === "BLOCO" ? "Bloco" : Number(a.ritmoMes.toFixed(2)),
      "Escopo Total Pavimentos": a.nLoc,
      "Data Início Geral": fmtBR(D(a.dataIni)),
      "Data Término Geral": fmtBR(D(a.dataFim)),
    }));

    const dadosPavimentos = [];
    atividadesFiltradas
      .filter((a) => a.temMetaNoPeriodo)
      .forEach((a) => {
        a.listaPavimentosPeriodo.forEach((pavNome) => {
          dadosPavimentos.push({
            "Atividade": a.nome,
            "Torre": a.torreNome,
            "Pavimento Meta": pavNome,
            "Data Início Período": a.iniJanela ? fmtBR(a.iniJanela) : "—",
            "Data Término Período": a.fimJanela ? fmtBR(a.fimJanela) : "—",
            "Status": a.estadoMeta === "em_andamento" ? "Em Execução" : "A Iniciar",
          });
        });
      });

    const nomeArquivo = `metas-${(proj.nome || "obra").replace(/\s+/g, "-")}-${tipoPeriodo}`;

    if (formato === "csv") {
      const colunas = Object.keys(dadosResumo[0] || {});
      const linhas = [colunas.join(";")];
      dadosResumo.forEach((r) => {
        linhas.push(colunas.map((col) => `"${r[col] || ""}"`).join(";"));
      });
      baixar(`${nomeArquivo}.csv`, "\uFEFF" + linhas.join("\n"), "text/csv;charset=utf-8");
      setModalExportMetas(false);
      return;
    }

    const wb = XLSX.utils.book_new();
    const wsResumo = XLSX.utils.json_to_sheet(dadosResumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo de Metas");

    if (dadosPavimentos.length > 0) {
      const wsPav = XLSX.utils.json_to_sheet(dadosPavimentos);
      XLSX.utils.book_append_sheet(wb, wsPav, "Pavimentos no Período");
    }

    if (formato === "xml") {
      const wbout = XLSX.write(wb, { bookType: "xlml", type: "string" });
      baixar(`${nomeArquivo}.xml`, wbout, "application/xml;charset=utf-8");
      setModalExportMetas(false);
      return;
    }

    // XLSX
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    baixar(
      `${nomeArquivo}.xlsx`,
      wbout,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    setModalExportMetas(false);
  };

  const CardKPI = ({ icon: Ic, label, valor, sub, cor }) => (
    <div className="p-4 rounded-sm shadow-sm" style={{ background: T.panel, border: `1px solid ${T.line}` }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: T.muted }}>
        <Ic size={15} style={{ color: cor || ORANGE }} />
        <span style={{ fontSize: 10, letterSpacing: 1, fontWeight: 700, textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ ...NUM, fontSize: 24, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>{valor}</div>
      {sub && <div style={{ ...NUM, fontSize: 11, color: T.dim, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: T.bg }}>
      <div className="max-w-6xl mx-auto p-6">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onVoltar}
            className="p-1.5 rounded-sm transition-colors hover:brightness-95"
            style={{ color: T.muted, border: `1px solid ${T.line}`, background: T.panel }}
            title="Voltar ao gráfico"
          >
            <ArrowLeft size={15} />
          </button>
          <LogoUnita ink={T.logoInk} height={22} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>
              Metas de Produção & Lookahead
            </h1>
            <span style={{ fontSize: 11, color: T.muted }}>
              {proj.nome} · Metas segmentadas para frente de hoje ({fmtBR(D(dataRefStr))})
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setModalExportMetas(true)}
              className="text-xs px-3.5 py-1.5 rounded flex items-center gap-1.5 font-bold transition-all hover:brightness-110 shadow-sm"
              style={{ background: ORANGE, color: "#fff" }}
            >
              <Download size={14} /> Exportar Metas
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Período */}
        <div
          className="p-4 mb-5 rounded-sm shadow-sm flex flex-wrap items-center justify-between gap-4"
          style={{ background: T.panel, border: `1px solid ${T.line}` }}
        >
          {/* Seleção do Período de Metas */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: T.text }}>
              <Calendar size={14} style={{ color: ORANGE }} /> Janela de Metas:
            </span>
            <div className="flex rounded overflow-hidden" style={{ border: `1px solid ${T.line}` }}>
              {[
                ["7d", "7 Dias"],
                ["15d", "15 Dias"],
                ["30d", "30 Dias (Mês)"],
                ["mes_atual", "Mês Atual"],
                ["saldo_total", "Todo o Saldo"],
                ["custom", "Personalizado"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTipoPeriodo(k)}
                  className="text-xs px-2.5 py-1.5 transition-colors font-medium"
                  style={{
                    background: tipoPeriodo === k ? ORANGE : T.raised,
                    color: tipoPeriodo === k ? "#fff" : T.muted,
                    borderRight: `1px solid ${T.line}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {tipoPeriodo === "custom" && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-xs" style={{ color: T.dim }}>Até:</span>
                <input
                  type="date"
                  value={customFimStr}
                  onChange={(e) => setCustomFimStr(e.target.value)}
                  className="text-xs px-2 py-1 outline-none rounded-xs"
                  style={{ ...NUM, border: `1px solid ${T.line}`, background: T.input, color: T.text }}
                />
              </div>
            )}
          </div>

          {/* Data de Referência (Hoje) */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: T.dim }}>Data de Status:</span>
            <input
              type="date"
              value={dataRefStr}
              onChange={(e) => setDataRefStr(e.target.value)}
              className="text-xs px-2 py-1 outline-none rounded-xs font-bold"
              style={{ ...NUM, border: `1px solid ${T.line}`, background: T.input, color: T.text }}
              title="Data de corte para cálculo do que está à frente"
            />
            <button
              onClick={() => setDataRefStr(iso(hoje()))}
              className="text-xs px-2 py-1 rounded transition-colors hover:bg-black/5"
              style={{ border: `1px solid ${T.line}`, color: T.muted }}
              title="Redefinir para hoje"
            >
              Hoje
            </button>
          </div>
        </div>

        {/* KPIs Resumo das Metas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <CardKPI
            icon={Target}
            label="Meta de Produção no Período"
            valor={`+${dadosMetas.percGeralMetaPeriodo}%`}
            sub={`${dadosMetas.totalPavimentosMetaPeriodo} pavs em ${dadosMetas.diasNoPeriodo} dias (${fmtBR(D(dataRefStr))} a ${fmtBR(dataFimCalculada)})`}
            cor={ORANGE}
          />
          <CardKPI
            icon={TrendingUp}
            label="Avanço Acumulado Previsto"
            valor={`${Math.min(100, dadosMetas.percGeralConcluido + dadosMetas.percGeralMetaPeriodo)}%`}
            sub={`atual: ${dadosMetas.percGeralConcluido}% + meta: ${dadosMetas.percGeralMetaPeriodo}%`}
            cor={OK}
          />
          <CardKPI
            icon={Layers}
            label="Frentes de Trabalho Ativas"
            valor={`${dadosMetas.atividadesComMeta.length}`}
            sub={`de ${dadosMetas.totalAtividades} atividades totais`}
            cor="#2E86AB"
          />
          <CardKPI
            icon={Clock}
            label="Progresso Atual (Hoje)"
            valor={`${dadosMetas.percGeralConcluido}%`}
            sub={`${dadosMetas.totalPavimentosConcluidos}/${dadosMetas.totalPavimentosGeral} pavs executados`}
            cor={T.dim}
          />
        </div>

        {/* Barra de Filtros Secundários e Alternância de Visualização */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro de Torre */}
            <select
              value={filtroTorre}
              onChange={(e) => {
                setFiltroTorre(e.target.value);
                setFiltroAtividade("TODAS");
              }}
              className="text-xs px-2.5 py-1.5 outline-none rounded font-medium"
              style={{ border: `1px solid ${T.line}`, background: T.panel, color: T.text }}
            >
              <option value="TODAS">Todas as torres</option>
              {proj.torres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>

            {/* Filtro de Atividade Específica */}
            <select
              value={filtroAtividade}
              onChange={(e) => setFiltroAtividade(e.target.value)}
              className="text-xs px-2.5 py-1.5 outline-none rounded font-medium"
              style={{ border: `1px solid ${T.line}`, background: T.panel, color: T.text, maxWidth: 220 }}
              title="Filtrar por atividade específica"
            >
              <option value="TODAS">Todas as atividades ({proj.atividades.length})</option>
              {proj.atividades
                .filter((a) => filtroTorre === "TODAS" || a.torreId === filtroTorre)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
            </select>

            {/* Filtro de Status */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 outline-none rounded"
              style={{ border: `1px solid ${T.line}`, background: T.panel, color: T.text }}
            >
              <option value="com_meta">Somente com metas no período ({dadosMetas.atividadesComMeta.length})</option>
              <option value="em_andamento">Em andamento</option>
              <option value="iniciar">A iniciar no período</option>
              <option value="todas">Todas as atividades ({dadosMetas.todasAtividades.length})</option>
            </select>

            {/* Busca textual */}
            <div className="flex items-center px-2 py-1 rounded" style={{ border: `1px solid ${T.line}`, background: T.panel }}>
              <Search size={13} style={{ color: T.dim, marginRight: 6 }} />
              <input
                type="text"
                placeholder="Buscar por texto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="text-xs bg-transparent outline-none w-32"
                style={{ color: T.text }}
              />
            </div>

            {(filtroAtividade !== "TODAS" || filtroTorre !== "TODAS" || busca) && (
              <button
                onClick={() => {
                  setFiltroAtividade("TODAS");
                  setFiltroTorre("TODAS");
                  setBusca("");
                }}
                className="text-xs px-2 py-1 rounded hover:underline"
                style={{ color: ORANGE }}
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Alternador de Visão (Cards vs Tabela) */}
          <div className="flex rounded overflow-hidden" style={{ border: `1px solid ${T.line}` }}>
            <button
              onClick={() => setModoVisao("cards")}
              className="text-xs px-3 py-1.5 font-bold transition-colors"
              style={{
                background: modoVisao === "cards" ? ORANGE : T.panel,
                color: modoVisao === "cards" ? "#fff" : T.muted,
              }}
            >
              Cartões com Barras %
            </button>
            <button
              onClick={() => setModoVisao("tabela")}
              className="text-xs px-3 py-1.5 font-bold transition-colors"
              style={{
                background: modoVisao === "tabela" ? ORANGE : T.panel,
                color: modoVisao === "tabela" ? "#fff" : T.muted,
              }}
            >
              Tabela de Metas
            </button>
          </div>
        </div>

        {/* VISÃO 1: CARTÕES COM BARRA SEGMENTADA DE METAS */}
        {modoVisao === "cards" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {atividadesFiltradas.length === 0 ? (
              <div className="col-span-2 p-8 text-center rounded-sm" style={{ background: T.panel, border: `1px solid ${T.line}` }}>
                <p className="text-xs font-semibold" style={{ color: T.muted }}>
                  Nenhuma atividade com meta encontrada para os filtros selecionados.
                </p>
              </div>
            ) : (
              atividadesFiltradas.map((a) => {
                return (
                  <div
                    key={a.id}
                    className="p-4 rounded-sm shadow-sm transition-all hover:border-orange-500 cursor-pointer flex flex-col justify-between"
                    style={{ background: T.panel, border: `1px solid ${T.line}` }}
                    onClick={() => onSelectAtividade(a.id)}
                  >
                    <div>
                      {/* Título da Atividade */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span style={{ width: 10, height: 10, background: a.cor, flexShrink: 0 }} />
                          <span className="text-sm font-bold truncate" style={{ color: T.text }}>
                            {a.nome}
                          </span>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-bold whitespace-nowrap"
                          style={{
                            ...NUM,
                            background:
                              a.estadoMeta === "em_andamento"
                                ? "rgba(254,80,0,0.12)"
                                : a.estadoMeta === "iniciar_no_periodo"
                                ? "rgba(46,158,99,0.12)"
                                : a.estadoMeta === "concluida"
                                ? "rgba(100,100,100,0.12)"
                                : "rgba(150,150,150,0.08)",
                            color:
                              a.estadoMeta === "em_andamento"
                                ? ORANGE
                                : a.estadoMeta === "iniciar_no_periodo"
                                ? OK
                                : T.dim,
                          }}
                        >
                          {a.estadoMeta === "em_andamento"
                            ? "Em Execução"
                            : a.estadoMeta === "iniciar_no_periodo"
                            ? "Inicia no Período"
                            : a.estadoMeta === "concluida"
                            ? "Concluída"
                            : "Futura"}
                        </span>
                      </div>

                      {/* Informações da Meta */}
                      <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xs" style={{ background: T.raised, border: `1px solid ${T.line}` }}>
                        <div>
                          <div className="text-xs" style={{ color: T.dim, fontSize: 10 }}>
                            META NO PERÍODO:
                          </div>
                          <div className="text-xs font-bold" style={{ ...NUM, color: ORANGE }}>
                            +{a.percNoPeriodo}% ({a.pavimentosNoPeriodo} pavs)
                          </div>
                          <div className="text-xs" style={{ color: T.muted, fontSize: 10.5 }}>
                            {a.pavIniPeriodoNome} ➔ {a.pavFimPeriodoNome}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs" style={{ color: T.dim, fontSize: 10 }}>
                            PREVISÃO ACUMULADA:
                          </div>
                          <div className="text-xs font-bold" style={{ ...NUM, color: T.text }}>
                            {a.percAcumuladoFinalPeriodo}% da atividade
                          </div>
                          <div className="text-xs" style={{ color: T.dim, fontSize: 10.5 }}>
                            Saldo futuro: {a.percSaldoFuturo}%
                          </div>
                        </div>
                      </div>

                      {/* Barra Segmentada de Progresso */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1" style={{ ...NUM, fontSize: 10, color: T.dim }}>
                          <span>Feito: {a.percConcluidoAteHoje}%</span>
                          <span style={{ color: ORANGE, fontWeight: 700 }}>Meta: +{a.percNoPeriodo}%</span>
                          <span>Final: {a.percAcumuladoFinalPeriodo}%</span>
                        </div>
                        <div className="w-full h-3 rounded-full flex overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
                          {/* Segmento 1: Concluído até hoje */}
                          {a.percConcluidoAteHoje > 0 && (
                            <div
                              style={{ width: `${a.percConcluidoAteHoje}%`, background: OK }}
                              title={`Concluído até hoje: ${a.percConcluidoAteHoje}% (${a.pavConcluidosAteHoje} pavs)`}
                            />
                          )}
                          {/* Segmento 2: Meta a executar neste período */}
                          {a.percNoPeriodo > 0 && (
                            <div
                              style={{ width: `${a.percNoPeriodo}%`, background: ORANGE }}
                              className="animate-pulse"
                              title={`Meta deste período: ${a.percNoPeriodo}% (${a.pavimentosNoPeriodo} pavs)`}
                            />
                          )}
                          {/* Segmento 3: Saldo restante futuro */}
                          {a.percSaldoFuturo > 0 && (
                            <div
                              style={{ width: `${a.percSaldoFuturo}%`, background: "transparent" }}
                              title={`Saldo restante futuro: ${a.percSaldoFuturo}%`}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rodapé do Card */}
                    <div className="flex items-center justify-between pt-2 mt-2 border-t text-xs" style={{ borderColor: T.line, ...NUM, fontSize: 10.5, color: T.dim }}>
                      <span>Torre: <strong>{a.torreNome}</strong></span>
                      <span>Velocidade: <strong>{a.modo === "BLOCO" ? "Bloco" : `${a.ritmoMes.toFixed(1)} pav/mês`}</strong></span>
                      <span className="flex items-center gap-0.5 text-orange-600 font-bold hover:underline">
                        Ver no gráfico <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VISÃO 2: TABELA DE METAS POR PAVIMENTO */}
        {modoVisao === "tabela" && (
          <div className="rounded-sm shadow-sm overflow-hidden" style={{ background: T.panel, border: `1px solid ${T.line}` }}>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ ...NUM, fontSize: 11.5, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: T.dim, textAlign: "left", background: T.raised }}>
                    {["Atividade", "Torre", "Status", "Pavimentos no Período", "Meta %", "Previsto Acumulado", "Período no Mês", "Velocidade"].map((h2, i) => (
                      <th
                        key={i}
                        className="px-4 py-2.5 font-bold uppercase tracking-wider text-xs"
                        style={{ borderBottom: `1px solid ${T.line}` }}
                      >
                        {h2}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {atividadesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-xs text-gray-500">
                        Nenhuma atividade encontrada.
                      </td>
                    </tr>
                  ) : (
                    atividadesFiltradas.map((a) => (
                      <tr
                        key={a.id}
                        onClick={() => onSelectAtividade(a.id)}
                        className="cursor-pointer transition-colors hover:bg-orange-50/20"
                        style={{ borderBottom: `1px solid ${T.line}` }}
                      >
                        <td className="px-4 py-2.5 font-medium" style={{ color: T.text }}>
                          <span className="flex items-center gap-2">
                            <span style={{ width: 8, height: 8, background: a.cor, flexShrink: 0 }} />
                            {a.nome}
                          </span>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: T.muted }}>
                          {a.torreNome}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="font-bold text-xs"
                            style={{
                              color:
                                a.estadoMeta === "em_andamento"
                                  ? ORANGE
                                  : a.estadoMeta === "iniciar_no_periodo"
                                  ? OK
                                  : T.dim,
                            }}
                          >
                            {a.estadoMeta === "em_andamento"
                              ? "Em Execução"
                              : a.estadoMeta === "iniciar_no_periodo"
                              ? "Iniciar no Período"
                              : a.estadoMeta === "concluida"
                              ? "Concluída"
                              : "Futura"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold" style={{ color: ORANGE }}>
                          {a.pavimentosNoPeriodo > 0
                            ? `${a.pavimentosNoPeriodo} pavs (${a.pavIniPeriodoNome} ➔ ${a.pavFimPeriodoNome})`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 font-bold" style={{ color: ORANGE }}>
                          {a.percNoPeriodo > 0 ? `+${a.percNoPeriodo}%` : "—"}
                        </td>
                        <td className="px-4 py-2.5 font-bold" style={{ color: T.text }}>
                          {a.percAcumuladoFinalPeriodo}%
                        </td>
                        <td className="px-4 py-2.5" style={{ color: T.muted }}>
                          {a.iniJanela && a.fimJanela
                            ? `${fmtBR(a.iniJanela)} ➔ ${fmtBR(a.fimJanela)}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: T.text }}>
                          {a.modo === "BLOCO" ? "Bloco" : `${a.ritmoMes.toFixed(1)} pav/mês`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Exportação de Metas */}
      {modalExportMetas && (
        <Modal
          T={T}
          titulo="Exportar Metas de Produção"
          sub={`${atividadesFiltradas.length} atividades filtradas · Janela: ${fmtBR(D(dataRefStr))} até ${fmtBR(dataFimCalculada)}`}
          onClose={() => setModalExportMetas(false)}
        >
          <div className="space-y-2.5">
            <button
              onClick={() => exportarMetas("xlsx")}
              className="w-full p-3.5 rounded-sm flex items-center gap-3 transition-colors hover:brightness-95 text-left border"
              style={{ background: T.raised, borderColor: T.line }}
            >
              <div
                className="w-10 h-10 rounded flex items-center justify-center font-bold text-white shrink-0"
                style={{ background: "#1D6F42" }}
              >
                <FileSpreadsheet size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold" style={{ color: T.text }}>
                  Planilha Excel (.xlsx)
                </div>
                <div style={{ fontSize: 10.5, color: T.muted }}>
                  Inclui 2 abas: <strong>Resumo de Metas (%)</strong> e <strong>Cronograma por Pavimento</strong>
                </div>
              </div>
            </button>

            <button
              onClick={() => exportarMetas("xml")}
              className="w-full p-3.5 rounded-sm flex items-center gap-3 transition-colors hover:brightness-95 text-left border"
              style={{ background: T.raised, borderColor: T.line }}
            >
              <div
                className="w-10 h-10 rounded flex items-center justify-center font-bold text-white shrink-0"
                style={{ background: "#D97706" }}
              >
                <FileCode size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold" style={{ color: T.text }}>
                  Planilha XML (.xml / .xlm)
                </div>
                <div style={{ fontSize: 10.5, color: T.muted }}>
                  Formato XML padrão de planilha para integração de dados
                </div>
              </div>
            </button>

            <button
              onClick={() => exportarMetas("csv")}
              className="w-full p-3.5 rounded-sm flex items-center gap-3 transition-colors hover:brightness-95 text-left border"
              style={{ background: T.raised, borderColor: T.line }}
            >
              <div
                className="w-10 h-10 rounded flex items-center justify-center font-bold text-white shrink-0"
                style={{ background: "#2563EB" }}
              >
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold" style={{ color: T.text }}>
                  Arquivo CSV (.csv)
                </div>
                <div style={{ fontSize: 10.5, color: T.muted }}>
                  Formato separado por ponto-e-vírgula com UTF-8 para Power BI / Python
                </div>
              </div>
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
