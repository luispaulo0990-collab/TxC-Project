// src/components/layout/SidebarNav.jsx
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
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
} from "lucide-react";
import { ORANGE, OK, NUM } from "../../constants/theme";

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
  exibirRealizado = true,
  setExibirRealizado,
  exibirCruzamentos = true,
  setExibirCruzamentos,
  showActivities = true,
  setShowActivities,
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
    { id: "metas", label: "Metas", icon: Target },
    { id: "macrofluxo", label: "Macrofluxos", icon: Zap },
    { id: "resumo", label: "Resumo", icon: LayoutDashboard },
  ];

  // Iniciais do usuário para o avatar suave
  const userNomeOuEmail = user?.email || user?.nome || "Usuário";
  const userInicial = userNomeOuEmail.charAt(0).toUpperCase();

  return (
    <nav
      className="w-64 shrink-0 h-full flex flex-col justify-between select-none shadow-xl z-30 transition-all"
      style={{
        background: "linear-gradient(180deg, #181A16 0%, #131411 100%)",
        color: "#ffffff",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* ── Topo: Marca & Nome da Obra ── */}
      <div className="p-3.5 flex flex-col gap-3 border-b" style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
        {/* Voltar para Home / Lista de Obras */}
        {onVoltarHome && (
          <button
            onClick={onVoltarHome}
            className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-full transition-all hover:bg-white/10 active:scale-95 self-start cursor-pointer"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.8)",
            }}
            title="Voltar para a lista de todas as obras"
          >
            <ChevronLeft size={13} />
            <span className="font-semibold text-[11px]">Obras & Empreendimentos</span>
          </button>
        )}

        {/* Card Suave: Logo & Obra */}
        <div
          className="p-2.5 rounded-2xl flex flex-col gap-2 transition-all"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-md"
              style={{
                background: "linear-gradient(135deg, #FE5000 0%, #FF6D2C 100%)",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(254, 80, 0, 0.25)",
              }}
            >
              <Layers size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span
                className="text-[10px] font-black tracking-widest block uppercase"
                style={{ color: "rgba(255, 255, 255, 0.5)", letterSpacing: 1.5 }}
              >
                TEMPO × CAMINHO
              </span>
              <span className="text-[10.5px] font-bold text-white/90 truncate block">
                {proj?.incorporador ? `${proj.incorporador}` : "Sistema de Gestão"}
              </span>
            </div>
          </div>

          <input
            value={proj?.nome || ""}
            onChange={(e) => setProj((p) => ({ ...p, nome: e.target.value }))}
            className="text-xs outline-none py-1.5 px-2.5 rounded-xl font-semibold transition-all hover:bg-white/[0.08] focus:bg-white/[0.1] focus:ring-1 focus:ring-orange-500/50 border truncate text-white"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              borderColor: "rgba(255, 255, 255, 0.08)",
            }}
            title="Clique para editar o nome da obra"
            placeholder="Nome da Obra..."
          />
        </div>

        {/* Filtro de Torre */}
        <div>
          <label
            className="text-[9.5px] uppercase font-bold tracking-wider block mb-1.5 px-1"
            style={{ color: "rgba(255, 255, 255, 0.45)" }}
          >
            Torre Ativa
          </label>
          <div className="relative flex items-center">
            <Building2 size={13} className="absolute left-3 text-white/50 pointer-events-none" />
            <select
              value={filtroTorre}
              onChange={(e) => setFiltroTorre(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 outline-none rounded-xl transition-all cursor-pointer font-medium text-white appearance-none"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.09)",
              }}
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
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3.5 custom-scrollbar">
        {/* Itens de Navegação Principal */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[9.5px] uppercase font-bold tracking-wider px-2 mb-0.5"
            style={{ color: "rgba(255, 255, 255, 0.45)" }}
          >
            Visualizações
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = vista === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setVista(item.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all font-semibold cursor-pointer active:scale-[0.99]"
                style={{
                  background: active
                    ? "linear-gradient(135deg, #FE5000 0%, #E04600 100%)"
                    : "transparent",
                  color: active ? "#ffffff" : "rgba(255, 255, 255, 0.72)",
                  boxShadow: active ? "0 4px 14px rgba(254, 80, 0, 0.28)" : "none",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} style={{ color: active ? "#ffffff" : "rgba(255, 255, 255, 0.6)" }} />
                  <span>{item.label}</span>
                </div>
                {item.badge && !active && (
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
                    style={{ background: `${OK}30`, color: OK }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Alternância da Coluna de Atividades (visível no gráfico) */}
        {vista === "grafico" && setShowActivities && (
          <div className="pt-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
            <button
              onClick={() => setShowActivities(!showActivities)}
              className="w-full py-2 px-2.5 text-xs flex items-center justify-between rounded-xl transition-all cursor-pointer hover:bg-white/[0.08]"
              style={{
                background: showActivities ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: showActivities ? "#ffffff" : "rgba(255, 255, 255, 0.55)",
              }}
              title={showActivities ? "Clique para ocultar a coluna de atividades" : "Clique para exibir a coluna de atividades"}
            >
              <div className="flex items-center gap-2 font-semibold">
                {showActivities ? <PanelLeftClose size={14} style={{ color: ORANGE }} /> : <PanelLeftOpen size={14} />}
                <span>Coluna Atividades</span>
              </div>
              <span
                className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                style={{
                  background: showActivities ? "rgba(254, 80, 0, 0.18)" : "rgba(255, 255, 255, 0.08)",
                  color: showActivities ? ORANGE : "rgba(255, 255, 255, 0.5)",
                }}
              >
                {showActivities ? "Visível" : "Oculta"}
              </span>
            </button>
          </div>
        )}

        {/* Alternância da Visão do Realizado */}
        <div className={vista === "grafico" && setShowActivities ? "pt-0" : "pt-2 border-t"} style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
          <button
            onClick={() => setExibirRealizado && setExibirRealizado(!exibirRealizado)}
            className="w-full py-2 px-2.5 text-xs flex items-center justify-between rounded-xl transition-all cursor-pointer hover:brightness-110"
            style={{
              background: exibirRealizado ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${exibirRealizado ? "rgba(16, 185, 129, 0.35)" : "rgba(255, 255, 255, 0.08)"}`,
              color: exibirRealizado ? "#34D399" : "rgba(255, 255, 255, 0.65)",
            }}
            title={exibirRealizado ? "Clique para ocultar os avanços realizados" : "Clique para exibir os avanços realizados"}
          >
            <div className="flex items-center gap-2 font-semibold">
              {exibirRealizado ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>Visão do Realizado</span>
            </div>
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
              style={{
                background: exibirRealizado ? "rgba(16, 185, 129, 0.25)" : "rgba(255, 255, 255, 0.08)",
                color: exibirRealizado ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
              }}
            >
              {exibirRealizado ? "ON" : "OFF"}
            </span>
          </button>
        </div>

        {/* Alternância dos Apontamentos de Cruzamentos */}
        <div className="pt-1.5" style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
          <button
            onClick={() => setExibirCruzamentos && setExibirCruzamentos(!exibirCruzamentos)}
            className="w-full py-2 px-2.5 text-xs flex items-center justify-between rounded-xl transition-all cursor-pointer hover:brightness-110"
            style={{
              background: exibirCruzamentos ? "rgba(214, 69, 69, 0.12)" : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${exibirCruzamentos ? "rgba(214, 69, 69, 0.35)" : "rgba(255, 255, 255, 0.08)"}`,
              color: exibirCruzamentos ? "#F87171" : "rgba(255, 255, 255, 0.65)",
            }}
            title={exibirCruzamentos ? "Clique para ocultar os apontamentos de cruzamentos no gráfico" : "Clique para exibir os apontamentos de cruzamentos no gráfico"}
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={14} />
              <span>Cruzamentos</span>
            </div>
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
              style={{
                background: exibirCruzamentos ? "rgba(214, 69, 69, 0.25)" : "rgba(255, 255, 255, 0.08)",
                color: exibirCruzamentos ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
              }}
            >
              {exibirCruzamentos ? "ON" : "OFF"}
            </span>
          </button>
        </div>

        {/* Ações de Obra / Import & Export */}
        <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
          <span
            className="text-[9.5px] uppercase font-bold tracking-wider px-2 mb-0.5"
            style={{ color: "rgba(255, 255, 255, 0.45)" }}
          >
            Ações Rápidas
          </span>

          {onNovaAtividade && (
            <button
              onClick={onNovaAtividade}
              className="w-full py-2 px-3 text-xs flex items-center justify-center gap-2 rounded-xl transition-all font-bold hover:brightness-110 active:scale-[0.98] shadow-sm cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #FE5000 0%, #FF6824 100%)",
                color: "#ffffff",
                boxShadow: "0 3px 12px rgba(254, 80, 0, 0.22)",
              }}
            >
              <Plus size={14} /> Nova Atividade
            </button>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onAbrirModal("importmenu")}
              className="py-2 px-2 text-xs flex items-center justify-center gap-1.5 rounded-xl transition-all font-semibold cursor-pointer hover:bg-white/[0.12] active:scale-95 text-white"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.09)",
              }}
              title="Importar planilha de atividades ou avanços"
            >
              <Upload size={13} /> Importar
            </button>
            <button
              onClick={() => onAbrirModal("exportar")}
              className="py-2 px-2 text-xs flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all hover:brightness-110 active:scale-95 text-white cursor-pointer shadow-sm"
              style={{
                background: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
              title="Exportar em Excel (.xlsx) ou Imagem (.png)"
            >
              <Download size={13} /> Exportar
            </button>
          </div>

          <button
            onClick={() => onSalvar(proj)}
            className="w-full py-2 px-3 text-xs flex items-center justify-center gap-2 rounded-xl transition-all font-semibold cursor-pointer hover:bg-white/[0.12] active:scale-[0.98] text-white"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.09)",
            }}
            title="Sincronizar e salvar no Supabase"
          >
            <Save size={13} /> Salvar Obra
          </button>
        </div>

        {/* Controles de Zoom (Ativos no modo Gráfico) */}
        {vista === "grafico" && (
          <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
            <span
              className="text-[9.5px] uppercase font-bold tracking-wider px-2"
              style={{ color: "rgba(255, 255, 255, 0.45)" }}
            >
              Zoom do Gráfico
            </span>
            <div
              className="flex items-center justify-between p-1 rounded-xl"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <button
                onClick={() => setPxPerDay((z) => Math.max(1.2, z / 1.3))}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
                title="Diminuir Zoom"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-xs px-1 font-bold" style={{ ...NUM, color: "rgba(255,255,255,0.85)" }}>
                {Math.round(pxPerDay * 30)}%
              </span>
              <button
                onClick={() => setPxPerDay((z) => Math.min(14, z * 1.3))}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
                title="Aumentar Zoom"
              >
                <ZoomIn size={13} />
              </button>
              <button
                onClick={() => setPxPerDay(3.4)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
                title="Restaurar Zoom Padrão"
              >
                <Maximize2 size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Rodapé: Tema & Usuário ── */}
      <div className="p-3 border-t flex flex-col gap-2" style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
        <button
          onClick={() => setTema((t) => (t === "claro" ? "escuro" : "claro"))}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/10 cursor-pointer"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "rgba(255, 255, 255, 0.8)",
          }}
        >
          <div className="flex items-center gap-2 font-medium">
            {tema === "claro" ? <Moon size={14} /> : <Sun size={14} />}
            <span>Tema {tema === "claro" ? "Escuro" : "Claro"}</span>
          </div>
          <span className="text-[10px] text-white/40 uppercase font-bold">{tema}</span>
        </button>

        {user && (
          <div
            className="flex items-center justify-between p-2 rounded-xl"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-xs"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {userInicial}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold block truncate text-white">
                  {userNomeOuEmail}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Conectado
                </span>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-red-400 transition-colors cursor-pointer"
                title="Encerrar Sessão"
              >
                <LogOut size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
