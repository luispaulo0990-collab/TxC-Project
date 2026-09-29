import React from "react";
import {
  Layers,
  TrendingUp,
  Target,
  Zap,
  LayoutDashboard,
  Building2,
  Plus,
  Upload,
  Download,
  Save,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  LogOut,
  FolderOpen,
} from "lucide-react";
import { BLACK, ORANGE, OK, NUM } from "../../constants/theme";

export const SidebarNav = ({
  proj,
  setProj,
  vista,
  setVista,
  filtroTorre,
  setFiltroTorre,
  tema,
  setTema,
  pxPerDay,
  setPxPerDay,
  onAbrirModal,
  onNovaAtividade,
  onSalvar,
  onVoltarHome,
  onLogout,
  user,
}) => {
  const navItems = [
    { id: "grafico", label: "Gráfico TxC", icon: Layers },
    { id: "avanco", label: "Avanço Físico", icon: TrendingUp, badge: "Novo" },
    { id: "metas", label: "Metas Lookahead", icon: Target },
    { id: "macrofluxo", label: "Macrofluxos", icon: Zap },
    { id: "resumo", label: "Resumo Executivo", icon: LayoutDashboard },
  ];

  return (
    <nav
      className="w-60 shrink-0 h-full flex flex-col justify-between select-none shadow-md z-30"
      style={{
        background: BLACK,
        color: "#ffffff",
        borderRight: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* ── Topo: Marca & Nome da Obra ── */}
      <div className="p-3.5 flex flex-col gap-3 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        {/* Voltar para Home / Lista de Obras */}
        {onVoltarHome && (
          <button
            onClick={onVoltarHome}
            className="flex items-center gap-1.5 text-xs py-1 px-2 rounded-sm transition-colors hover:bg-white/10 self-start"
            style={{ color: "rgba(255,255,255,0.7)" }}
            title="Voltar para a lista de todas as obras"
          >
            <ChevronLeft size={14} />
            <span className="font-medium">Obras & Empreendimentos</span>
          </button>
        )}

        {/* Logo TxC */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded flex items-center justify-center font-bold text-xs shrink-0 shadow-sm"
            style={{ background: ORANGE, color: "#fff" }}
          >
            <Layers size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-black tracking-widest block uppercase text-white" style={{ letterSpacing: 1.5 }}>
              TEMPO × CAMINHO
            </span>
            <input
              value={proj?.nome || ""}
              onChange={(e) => setProj((p) => ({ ...p, nome: e.target.value }))}
              className="bg-transparent text-xs outline-none py-0.5 w-full font-medium transition-colors hover:border-white/30 focus:border-white/60 border-b border-transparent truncate"
              style={{ color: "rgba(255,255,255,0.85)" }}
              title="Clique para editar o nome da obra"
              placeholder="Nome da Obra..."
            />
          </div>
        </div>

        {/* Filtro de Torre */}
        <div>
          <label className="text-[9.5px] uppercase font-bold tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Torre Ativa:
          </label>
          <div className="relative flex items-center">
            <Building2 size={13} className="absolute left-2 text-white/50 pointer-events-none" />
            <select
              value={filtroTorre}
              onChange={(e) => setFiltroTorre(e.target.value)}
              className="w-full text-xs pl-7 pr-2 py-1.5 outline-none rounded bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium"
            >
              <option value="TODAS" style={{ color: "#000" }}>
                Todas as torres
              </option>
              {proj?.torres?.map((t) => (
                <option key={t.id} value={t.id} style={{ color: "#000" }}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Centro: Abas de Navegação & Ações ── */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {/* Itens de Navegação Principal */}
        <div className="flex flex-col gap-1">
          <span className="text-[9.5px] uppercase font-bold tracking-wider px-2" style={{ color: "rgba(255,255,255,0.45)" }}>
            Visualizações
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = vista === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setVista(item.id)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-sm text-xs transition-all font-medium"
                style={{
                  background: active ? ORANGE : "transparent",
                  color: active ? "#ffffff" : "rgba(255,255,255,0.75)",
                  fontWeight: active ? 700 : 500,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.6)" }} />
                  <span>{item.label}</span>
                </div>
                {item.badge && !active && (
                  <span
                    className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wide"
                    style={{ background: `${OK}30`, color: OK }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Ações de Obra / Import & Export */}
        <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <span className="text-[9.5px] uppercase font-bold tracking-wider px-2" style={{ color: "rgba(255,255,255,0.45)" }}>
            Ações Rápidas
          </span>

          {onNovaAtividade && (
            <button
              onClick={onNovaAtividade}
              className="w-full py-1.5 px-2.5 text-xs flex items-center gap-2 rounded transition-all font-bold hover:brightness-110 shadow-xs"
              style={{ background: ORANGE, color: "#ffffff" }}
            >
              <Plus size={14} /> Nova Atividade
            </button>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onAbrirModal("importmenu")}
              className="py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 rounded transition-colors bg-white/10 hover:bg-white/15 border border-white/15 text-white"
              title="Importar planilha de atividades ou avanços"
            >
              <Upload size={13} /> Importar
            </button>
            <button
              onClick={() => onAbrirModal("exportar")}
              className="py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 rounded font-bold transition-all bg-emerald-600 hover:bg-emerald-500 text-white"
              title="Exportar em Excel (.xlsx) ou Imagem (.png)"
            >
              <Download size={13} /> Exportar
            </button>
          </div>

          <button
            onClick={() => onSalvar(proj)}
            className="w-full py-1.5 px-2.5 text-xs flex items-center justify-center gap-2 rounded transition-colors bg-white/10 hover:bg-white/15 border border-white/15 text-white"
            title="Sincronizar e salvar no Supabase"
          >
            <Save size={13} /> Salvar Obra
          </button>
        </div>

        {/* Controles de Zoom (Ativos no modo Gráfico) */}
        {vista === "grafico" && (
          <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <span className="text-[9.5px] uppercase font-bold tracking-wider px-2" style={{ color: "rgba(255,255,255,0.45)" }}>
              Zoom do Gráfico
            </span>
            <div className="flex items-center justify-between bg-white/5 p-1 rounded border border-white/10">
              <button
                onClick={() => setPxPerDay((z) => Math.max(1.2, z / 1.3))}
                className="p-1 hover:bg-white/15 rounded text-white/70 hover:text-white"
                title="Diminuir Zoom"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-xs px-1 font-bold" style={{ ...NUM, color: "rgba(255,255,255,0.8)" }}>
                {Math.round(pxPerDay * 30)}%
              </span>
              <button
                onClick={() => setPxPerDay((z) => Math.min(14, z * 1.3))}
                className="p-1 hover:bg-white/15 rounded text-white/70 hover:text-white"
                title="Aumentar Zoom"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => setPxPerDay(3.4)}
                className="p-1 hover:bg-white/15 rounded text-white/70 hover:text-white"
                title="Restaurar Zoom Padrão"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Rodapé: Tema & Usuário ── */}
      <div className="p-3 border-t flex flex-col gap-2" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <button
          onClick={() => setTema((t) => (t === "claro" ? "escuro" : "claro"))}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs bg-white/5 hover:bg-white/10 transition-colors text-white/80"
        >
          <div className="flex items-center gap-2">
            {tema === "claro" ? <Moon size={14} /> : <Sun size={14} />}
            <span>Tema {tema === "claro" ? "Escuro" : "Claro"}</span>
          </div>
          <span className="text-[10px] text-white/40 uppercase">{tema}</span>
        </button>

        {user && (
          <div className="flex items-center justify-between pt-1 px-1">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold block truncate text-white">
                {user.email || user.nome || "Usuário"}
              </span>
              <span className="text-[10px] text-white/40 block">Online</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 hover:bg-white/10 rounded text-white/50 hover:text-red-400 transition-colors"
                title="Encerrar Sessão"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
