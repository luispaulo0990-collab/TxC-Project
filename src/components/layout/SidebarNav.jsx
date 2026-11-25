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
  LogIn,
  Expand,
  Minimize,
} from "lucide-react";
import { ORANGE, OK, NUM, INK } from "../../constants/theme";
import { LogoUnita } from "../common/LogoUnita";

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
  telaCheia = false,
  onAlternarTelaCheia,
}) => {
  const isMember = userRole === "member" || permissoes?.isMember || (permissoes && !permissoes.podeEditar);
  const podeVerAbaAvanco = permissoes ? !!permissoes.podeVerAbaAvanco : userRole === "dev";

  const allNavItems = [
    { id: "grafico", label: "Gráfico TxC", icon: Layers },
    { id: "avanco", label: "Avanço Físico", icon: TrendingUp },
    { id: "histograma", label: "Histograma", icon: Users, badge: "Em Breve" },
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
      className="w-60 shrink-0 h-full flex flex-col justify-between select-none z-30 transition-all"
      style={{
        background: INK,
        color: "#ffffff",
        borderRight: `2px solid ${ORANGE}`,
      }}
    >
      {/* ── Topo: Marca & Nome da Obra ── */}
      <div className="p-3.5 flex flex-col gap-3 border-b" style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
        {/* Voltar para Home / Lista de Obras */}
        {onVoltarHome && (
          <button
            onClick={onVoltarHome}
            className="flex items-center gap-1.5 text-xs py-1.5 px-2.5 transition-colors hover:bg-white/10 hover:text-white self-start cursor-pointer"
            style={{
              borderRadius: 10,
              color: "#C9C4C0",
            }}
            title="Voltar para a lista de todas as obras"
          >
            <ChevronLeft size={13} />
            <span className="font-semibold text-[11px]">Obras & Empreendimentos</span>
          </button>
        )}

        {/* Marca & Obra */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 px-1">
            <LogoUnita ink="#fff" height={26} />
            <div className="min-w-0 flex-1 pl-2.5" style={{ borderLeft: "1px solid rgba(255,255,255,0.14)" }}>
              <span className="text-[11.5px] font-semibold block" style={{ color: "#fff", letterSpacing: "0.02em" }}>
                Tempo × Caminho
              </span>
              <span className="text-[11px] truncate block" style={{ color: "#A19B96" }}>
                {proj?.incorporador ? `${proj.incorporador}` : "Linha de Balanço"}
              </span>
            </div>
          </div>

          <input
            value={proj?.nome || ""}
            readOnly={permissoes && !permissoes.podeEditar}
            onChange={(e) => setProj((p) => ({ ...p, nome: e.target.value }))}
            className="text-[13.5px] outline-none py-2 px-3 font-semibold transition-all hover:bg-white/[0.08] focus:bg-white/[0.1] border truncate text-white"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              borderColor: "rgba(255, 255, 255, 0.10)",
              borderRadius: 10,
              cursor: permissoes && !permissoes.podeEditar ? "default" : "text",
            }}
            title={permissoes && !permissoes.podeEditar ? "Nome da Obra (somente leitura)" : "Clique para editar o nome da obra"}
            placeholder="Nome da Obra..."
          />
        </div>

        {/* Filtro de Torre */}
        <div>
          <label
            className="text-[12px] font-medium block mb-1.5 px-1"
            style={{ color: "#A19B96" }}
          >
            Torre Ativa
          </label>
          <div className="relative flex items-center">
            <Building2 size={15} className="absolute left-3 text-white/50 pointer-events-none" />
            <select
              value={filtroTorre}
              onChange={(e) => setFiltroTorre(e.target.value)}
              className="w-full text-[13px] py-2 outline-none transition-all cursor-pointer font-medium text-white appearance-none"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                borderRadius: 10,
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
            className="text-[12px] font-medium px-2 mb-1"
            style={{ color: "#A19B96" }}
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
                className={`w-full flex items-center justify-between px-3 py-2 text-[14px] transition-colors cursor-pointer ${active ? "" : "hover:bg-white/10 hover:text-white"}`}
                style={{
                  borderRadius: 10,
                  background: active ? "rgba(255, 255, 255, 0.10)" : "transparent",
                  color: active ? "#ffffff" : "#C9C4C0",
                  fontWeight: active ? 600 : 500,
                  boxShadow: active ? `inset 3px 0 0 ${ORANGE}` : "none",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={17} style={{ color: active ? ORANGE : "#A19B96" }} />
                  <span>{item.label}</span>
                </div>
                {item.badge && !active && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{
                      background: item.badge === "Em Breve" ? "rgba(183, 121, 31, 0.22)" : `${OK}30`,
                      color: item.badge === "Em Breve" ? "#E9B45A" : OK,
                    }}
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
          className="w-full flex items-center justify-between px-3 py-2 text-[13px] transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          style={{
            borderRadius: 10,
            color: "#C9C4C0",
          }}
        >
          <div className="flex items-center gap-2 font-medium">
            {tema === "claro" ? <Moon size={14} /> : <Sun size={14} />}
            <span>Tema {tema === "claro" ? "Escuro" : "Claro"}</span>
          </div>
          <span className="text-[11px] font-medium" style={{ color: "#77716D" }}>{tema}</span>
        </button>

        {onAlternarTelaCheia && (
          <button
            onClick={onAlternarTelaCheia}
            className="w-full flex items-center justify-between px-3 py-2 text-[13px] transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            style={{
              borderRadius: 10,
              color: "#C9C4C0",
            }}
            title={telaCheia ? "Sair da tela cheia (Esc)" : "Expandir o app para tela cheia"}
          >
            <div className="flex items-center gap-2 font-medium">
              {telaCheia ? <Minimize size={14} /> : <Expand size={14} />}
              <span>{telaCheia ? "Sair da Tela Cheia" : "Tela Cheia"}</span>
            </div>
            {telaCheia && <span className="text-[11px] font-medium" style={{ color: "#77716D" }}>Esc</span>}
          </button>
        )}

        {user ? (
          <div
            className="flex items-center justify-between p-2 mt-1"
            style={{
              borderRadius: 10,
              background: "rgba(255, 255, 255, 0.06)",
            }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-xs"
                style={{
                  background: ORANGE,
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
                    className="text-[11px] px-2 rounded-full font-medium"
                    style={{
                      background: userRole === "dev" ? "rgba(59,130,246,0.2)" : userRole === "admin" ? "rgba(254,80,0,0.2)" : "rgba(30, 138, 76,0.2)",
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
        ) : (
          <button
            onClick={() => onAbrirModal && onAbrirModal("login")}
            className="w-full flex items-center justify-center gap-2 px-3 text-[14px] font-medium text-white transition-colors cursor-pointer"
            style={{
              height: 38,
              borderRadius: 10,
              background: ORANGE,
              boxShadow: "0 2px 8px rgb(254 80 0 / 0.2)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#E04700")}
            onMouseLeave={(e) => (e.currentTarget.style.background = ORANGE)}
            title="Acessar com perfil Admin ou Dev"
          >
            <LogIn size={13} />
            <span>Fazer Login</span>
          </button>
        )}
      </div>
    </nav>
  );
};
