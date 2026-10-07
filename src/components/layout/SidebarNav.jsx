// src/components/layout/SidebarNav.jsx
import React from "react";
import {
  Layers,
  TrendingUp,
  Users,
  Target,
  Zap,
  LayoutDashboard,
  Building2,
  Upload,
  Download,
  Save,
  Sun,
  Moon,
  ChevronLeft,
  ChevronDown,
  LogOut,
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
  userRole,
  permissoes,
}) => {
  const isMember = userRole === "member" || permissoes?.isMember || (permissoes && !permissoes.podeEditar);
  const podeVerAbaAvanco = permissoes ? !!permissoes.podeVerAbaAvanco : userRole === "dev";

  const allNavItems = [
    { id: "grafico", label: "Gráfico TxC", icon: Layers },
    { id: "avanco", label: "Avanço Físico", icon: TrendingUp },
    { id: "histograma", label: "Histograma", icon: Users, badge: "Novo" },
    { id: "metas", label: "Metas", icon: Target },
    { id: "macrofluxo", label: "Macrofluxos", icon: Zap },
    { id: "resumo", label: "Resumo", icon: LayoutDashboard },
  ];

  const navItems = allNavItems.filter((item) => {
    if (item.id === "avanco") {
      // Aba "Avanço Físico" ocultada para Admin e Membro; visível exclusivamente para Dev
      return podeVerAbaAvanco;
    }
    if (item.id === "macrofluxo" || item.id === "histograma") {
      return !isMember;
    }
    return true;
  });

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
            readOnly={permissoes && !permissoes.podeEditar}
            onChange={(e) => setProj((p) => ({ ...p, nome: e.target.value }))}
            className="text-[13px] outline-none py-1.5 px-2.5 rounded-xl font-semibold transition-all hover:bg-white/[0.08] focus:bg-white/[0.1] focus:ring-1 focus:ring-orange-500/50 border truncate text-white"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              borderColor: "rgba(255, 255, 255, 0.08)",
              cursor: permissoes && !permissoes.podeEditar ? "default" : "text",
            }}
            title={permissoes && !permissoes.podeEditar ? "Nome da Obra (somente leitura)" : "Clique para editar o nome da obra"}
            placeholder="Nome da Obra..."
          />
        </div>

        {/* Filtro de Torre */}
        <div>
          <label
            className="text-[10.5px] uppercase font-bold tracking-wider block mb-1.5 px-1"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            Torre Ativa
          </label>
          <div className="relative flex items-center">
            <Building2 size={15} className="absolute left-3 text-white/50 pointer-events-none" />
            <select
              value={filtroTorre}
              onChange={(e) => setFiltroTorre(e.target.value)}
              className="w-full text-[13px] py-2 outline-none rounded-xl transition-all cursor-pointer font-medium text-white appearance-none"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                paddingLeft: "36px",
                paddingRight: "28px",
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
            <ChevronDown size={14} className="absolute right-3 text-white/40 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Centro: Abas de Navegação ── */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3.5 custom-scrollbar">
        {/* Itens de Navegação Principal */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] uppercase font-bold tracking-wider px-2 mb-0.5"
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
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all font-semibold cursor-pointer active:scale-[0.99]"
                style={{
                  background: active
                    ? "linear-gradient(135deg, #FE5000 0%, #E04600 100%)"
                    : "transparent",
                  color: active ? "#ffffff" : "rgba(255, 255, 255, 0.8)",
                  boxShadow: active ? "0 4px 14px rgba(254, 80, 0, 0.28)" : "none",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={17} style={{ color: active ? "#ffffff" : "rgba(255, 255, 255, 0.65)" }} />
                  <span className="font-semibold">{item.label}</span>
                </div>
                {item.badge && !active && (
                  <span
                    className="text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
                    style={{ background: `${OK}30`, color: OK }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[9.5px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider"
                    style={{
                      background: userRole === "dev" ? "rgba(59,130,246,0.2)" : userRole === "admin" ? "rgba(254,80,0,0.2)" : "rgba(16,185,129,0.2)",
                      color: userRole === "dev" ? "#60A5FA" : userRole === "admin" ? "#FE5000" : "#34D399",
                    }}
                  >
                    {userRole === "dev" ? "Dev" : userRole === "admin" ? "Admin" : "Visualizador"}
                  </span>
                  {permissoes?.isMember && (
                    <span className="text-[9.5px] text-white/40 font-medium">
                      (Leitura)
                    </span>
                  )}
                </div>
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
