import React, { useState } from "react";
import {
  Plus, Building2, Trash2, Calendar, Layers, ChevronRight,
  FolderOpen, LogOut, User, Crown, Code2, Eye, Archive, ArchiveRestore
} from "lucide-react";
import { ORANGE, BLACK, FONT } from "../../constants/theme";
import { calcularPermissao } from "../../hooks/usePermissao";

const ROLE_CONFIG = {
  admin:  { label: "Admin",  icon: Crown, color: "#FE5000", bg: "rgba(254,80,0,0.12)" },
  dev:    { label: "Dev",    icon: Code2, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  member: { label: "Membro", icon: Eye,   color: "#10B981", bg: "rgba(16,185,129,0.12)" },
};

function RoleBadge({ role }) {
  const cfg = (role && ROLE_CONFIG[role]) ? ROLE_CONFIG[role] : ROLE_CONFIG.admin;
  const Icon = cfg.icon || Crown;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: cfg.bg || "rgba(254,80,0,0.12)", color: cfg.color || "#FE5000",
      borderRadius: 99, padding: "2px 8px",
      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}>
      <Icon size={10} />
      {cfg.label || "Admin"}
    </span>
  );
}

/* ─── Formatação de data relativa ───────────────────────────── */
function dataRelativa(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `${d} dias atrás`;
  return new Date(ts).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

/* ─── Card de Obra ───────────────────────────────────────────── */
function ObraCard({ obra, isAtiva, onClick, onExcluir, onArquivar, tema, podeExcluir }) {
  const [hovered, setHovered] = useState(false);

  const isDark = tema === "escuro";
  const bg = isDark
    ? hovered ? "#22241F" : "#1A1C19"
    : hovered ? "#F0F0EE" : "#FFFFFF";
  const border = isAtiva ? ORANGE : (isDark ? "#33352F" : "#E2E2DF");
  const textColor = isDark ? "#ECEDEB" : BLACK;
  const mutedColor = isDark ? "#9DA098" : "#6A6E69";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 14,
        padding: "22px 22px 18px",
        cursor: "pointer",
        transition: "all 0.18s ease",
        position: "relative",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered
          ? isDark ? "0 12px 32px rgba(0,0,0,0.5)" : "0 12px 32px rgba(0,0,0,0.12)"
          : isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.06)",
        fontFamily: FONT,
        minHeight: 160,
        display: "flex",
        flexDirection: "column",
        opacity: obra.arquivado ? 0.85 : 1,
      }}
    >
      {/* Badges superiores: Ativa e/ou Arquivada */}
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 6 }}>
        {obra.arquivado && (
          <span style={{
            background: "rgba(100, 116, 139, 0.2)",
            border: "1px solid rgba(100, 116, 139, 0.35)",
            color: isDark ? "#94A3B8" : "#475569",
            fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6,
            padding: "2px 7px", borderRadius: 99,
            display: "inline-flex", alignItems: "center", gap: 3.5,
            textTransform: "uppercase",
          }}>
            <Archive size={9.5} />
            Arquivada
          </span>
        )}
        {isAtiva && (
          <span style={{
            background: ORANGE, color: "#fff",
            fontSize: 10, fontWeight: 700, letterSpacing: 1,
            padding: "2px 8px", borderRadius: 99,
            textTransform: "uppercase",
          }}>
            Ativa
          </span>
        )}
      </div>

      {/* Ícone + Nome */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: isAtiva ? ORANGE : (isDark ? "#2A2C27" : "#F0F0EE"),
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Building2 size={20} color={isAtiva ? "#fff" : mutedColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 15, color: textColor,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            lineHeight: 1.3,
          }}>
            {obra.nome || "Obra sem nome"}
          </div>
          {obra.incorporador && (
            <div style={{ fontSize: 11, fontWeight: 600, color: ORANGE, marginTop: 2 }}>
              {obra.incorporador}
            </div>
          )}
          <div style={{ fontSize: 11, color: mutedColor, marginTop: 3 }}>
            {dataRelativa(obra.em)}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginTop: "auto" }}>
        {obra.nTorres != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Layers size={12} color={mutedColor} />
            <span style={{ fontSize: 12, color: mutedColor }}>
              {obra.nTorres} {obra.nTorres === 1 ? "torre" : "torres"}
            </span>
          </div>
        )}
        {obra.nAtividades != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Calendar size={12} color={mutedColor} />
            <span style={{ fontSize: 12, color: mutedColor }}>
              {obra.nAtividades} {obra.nAtividades === 1 ? "atividade" : "atividades"}
            </span>
          </div>
        )}
      </div>

      {/* Ações de gerenciamento (Exclusivo Dev: Arquivar e Excluir) */}
      {podeExcluir && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", bottom: 12, right: 12,
            display: "flex", alignItems: "center", gap: 6,
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s ease",
            zIndex: 3,
          }}
        >
          {onArquivar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArquivar(obra.id, !obra.arquivado);
              }}
              title={obra.arquivado ? "Reativar obra (desarquivar)" : "Arquivar obra"}
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                border: `1px solid ${border}`,
                cursor: "pointer",
                padding: "4px 8px", borderRadius: 6,
                display: "flex", alignItems: "center", gap: 4,
                color: isDark ? "#CBD5E1" : "#475569",
                fontSize: 10.5, fontWeight: 600,
                transition: "all 0.15s",
              }}
            >
              {obra.arquivado ? <ArchiveRestore size={11} /> : <Archive size={11} />}
              <span>{obra.arquivado ? "Reativar" : "Arquivar"}</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onExcluir();
            }}
            title="Excluir obra permanentemente"
            style={{
              background: "rgba(214, 69, 69, 0.12)",
              border: "1px solid rgba(214, 69, 69, 0.35)",
              cursor: "pointer",
              padding: "4px 8px", borderRadius: 6,
              display: "flex", alignItems: "center", gap: 4,
              color: "#EF4444",
              fontSize: 10.5, fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            <Trash2 size={11} />
            <span>Excluir</span>
          </button>
        </div>
      )}

      {/* Seta hover quando não há botões ou para visualizadores */}
      {!podeExcluir && (
        <ChevronRight
          size={18}
          style={{
            position: "absolute", right: 18, top: "50%", marginTop: -9,
            color: isAtiva ? ORANGE : mutedColor,
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s, transform 0.15s",
            transform: hovered ? "translateX(3px)" : "translateX(0)",
          }}
        />
      )}
    </div>
  );
}

/* ─── Card "Nova Obra" ───────────────────────────────────────── */
function NovaObraCard({ onClick, tema }) {
  const [hovered, setHovered] = useState(false);
  const isDark = tema === "escuro";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1.5px dashed ${hovered ? ORANGE : (isDark ? "#3E4138" : "#CCCCC9")}`,
        borderRadius: 14,
        padding: "22px 22px 18px",
        cursor: "pointer",
        transition: "all 0.18s ease",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: 160, gap: 12,
        background: hovered
          ? isDark ? "rgba(254,80,0,0.06)" : "rgba(254,80,0,0.04)"
          : "transparent",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: hovered ? ORANGE : (isDark ? "#22241F" : "#F0F0EE"),
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.18s",
      }}>
        <Plus size={24} color={hovered ? "#fff" : (isDark ? "#63665F" : "#A6A8A3")} />
      </div>
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: hovered ? ORANGE : (isDark ? "#63665F" : "#A6A8A3"),
        transition: "color 0.18s",
        fontFamily: FONT,
      }}>
        Nova Obra
      </span>
    </div>
  );
}

/* ─── Tela Principal ─────────────────────────────────────────── */
export function HomeScreen({
  salvos, projAtualId, tema, user, userRole,
  onLogout, onSelecionarObra, onNovaObra, onExcluirObra, onArquivarObra,
}) {
  const [filtroAba, setFiltroAba] = useState("ativas"); // "ativas" | "arquivadas" | "todas"

  const isDark = tema === "escuro";
  const bg = isDark ? "#111310" : "#ECEDEB";
  const textColor = isDark ? "#ECEDEB" : BLACK;
  const mutedColor = isDark ? "#9DA098" : "#6A6E69";
  const subtleColor = isDark ? "#1A1C19" : "#FFFFFF";
  const border = isDark ? "#33352F" : "#E2E2DF";

  const perm = calcularPermissao(userRole);
  const podeExcluir = perm.podeExcluir; // Apenas Dev pode apagar obras e arquivar
  const podeCriar   = perm.podeCriar;   // Dev e Admin podem criar obras

  // Separação de obras por status de arquivamento
  const todasObras = Array.isArray(salvos) ? salvos : [];
  const obrasAtivas = todasObras.filter((o) => !o.arquivado);
  const obrasArquivadas = todasObras.filter((o) => !!o.arquivado);

  const obrasExibidas =
    filtroAba === "ativas"
      ? obrasAtivas
      : filtroAba === "arquivadas"
      ? obrasArquivadas
      : todasObras;

  const temObras = obrasExibidas.length > 0;

  return (
    <div style={{
      minHeight: "100vh", background: bg, fontFamily: FONT,
      color: textColor, display: "flex", flexDirection: "column",
    }}>
      {/* ── Topo ── */}
      <header style={{
        background: BLACK, color: "#fff",
        padding: "0 32px", height: 56,
        display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: ORANGE, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "#fff",
        }}>
          <Layers size={16} />
        </div>
        <span style={{
          fontSize: 12, letterSpacing: 2, fontWeight: 700,
          color: "#fff", textTransform: "uppercase",
        }}>
          Tempo × Caminho
        </span>

        {user && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {/* Badge de papel */}
            {userRole && <RoleBadge role={userRole} />}

            {/* Email */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
              <User size={14} color="rgba(255,255,255,0.5)" />
              <span>{user.email || user.user_metadata?.email || "Usuário"}</span>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff", padding: "4px 10px", borderRadius: 6,
                  fontSize: 11, display: "flex", alignItems: "center",
                  gap: 6, cursor: "pointer", transition: "background 0.15s ease",
                }}
                title="Desconectar do sistema"
              >
                <LogOut size={13} />
                <span>Sair</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── Conteúdo ── */}
      <main style={{
        flex: 1, maxWidth: 960, width: "100%",
        margin: "0 auto", padding: "48px 32px",
      }}>

        {/* Saudação e Abas de Filtro */}
        <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{
              fontSize: 28, fontWeight: 800, color: textColor,
              margin: 0, letterSpacing: -0.5, lineHeight: 1.2,
            }}>
              Suas Obras
            </h1>
            <p style={{ fontSize: 13, color: mutedColor, marginTop: 6 }}>
              {todasObras.length > 0
                ? `${obrasAtivas.length} obras ativas · ${obrasArquivadas.length} arquivadas`
                : "Nenhuma obra cadastrada ainda · comece criando sua primeira obra"}
            </p>
          </div>

          {/* Abas Ativas / Arquivadas / Todas */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
            padding: "4px",
            borderRadius: 12,
            border: `1px solid ${border}`,
          }}>
            {[
              { id: "ativas", label: "Ativas", count: obrasAtivas.length },
              { id: "arquivadas", label: "Arquivadas", count: obrasArquivadas.length, icon: Archive },
              { id: "todas", label: "Todas", count: todasObras.length },
            ].map((tab) => {
              const ativo = filtroAba === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFiltroAba(tab.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: ativo ? 700 : 500,
                    cursor: "pointer",
                    border: "none",
                    background: ativo
                      ? (isDark ? "rgba(254,80,0,0.2)" : "rgba(254,80,0,0.12)")
                      : "transparent",
                    color: ativo ? (isDark ? "#FFA273" : ORANGE) : mutedColor,
                    transition: "all 0.15s ease",
                  }}
                >
                  {TabIcon && <TabIcon size={12} />}
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 99,
                      background: ativo ? ORANGE : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                      color: ativo ? "#fff" : mutedColor,
                      fontWeight: 700,
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid de obras */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}>
          {/* Card nova obra — só para quem pode criar e se não estiver na aba arquivadas */}
          {podeCriar && filtroAba !== "arquivadas" && <NovaObraCard onClick={onNovaObra} tema={tema} />}

          {/* Cards das obras existentes */}
          {obrasExibidas.map((obra) => (
            <ObraCard
              key={obra.id}
              obra={obra}
              isAtiva={obra.id === projAtualId}
              onClick={() => onSelecionarObra(obra.id)}
              onExcluir={() => onExcluirObra(obra.id)}
              onArquivar={onArquivarObra}
              tema={tema}
              podeExcluir={podeExcluir}
            />
          ))}
        </div>

        {/* Dica quando vazio */}
        {!temObras && (
          <div style={{
            marginTop: 48, padding: "28px 32px", borderRadius: 14,
            background: subtleColor,
            border: `1px solid ${isDark ? "#33352F" : "#E2E2DF"}`,
            display: "flex", alignItems: "center", gap: 20,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10, flexShrink: 0,
              background: isDark ? "#22241F" : "#F5F5F3",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FolderOpen size={22} color={ORANGE} />
            </div>
            <div>
              {filtroAba === "arquivadas" ? (
                <>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: textColor }}>
                    Nenhuma obra arquivada
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: mutedColor }}>
                    Obras arquivadas por desenvolvedores (Dev) aparecem nesta aba para consulta ou reativação a qualquer momento.
                  </p>
                </>
              ) : podeCriar ? (
                <>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: textColor }}>
                    Comece criando sua primeira obra
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: mutedColor }}>
                    Clique em <strong style={{ color: ORANGE }}>+ Nova Obra</strong> para configurar um novo empreendimento com torres, pavimentos e atividades.
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: textColor }}>
                    Nenhuma obra disponível
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: mutedColor }}>
                    Aguarde um <strong>Admin</strong> ou <strong>Dev</strong> criar obras no seu grupo.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Rodapé ── */}
      <footer style={{
        padding: "16px 40px",
        borderTop: `1px solid ${isDark ? "#22241F" : "#DEDEDB"}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 11, color: mutedColor }}>
          Tempo × Caminho · Linha de Balanço
        </span>
        <span style={{ fontSize: 11, color: isDark ? "#33352F" : "#CCCCC9" }}>
          v1.0
        </span>
      </footer>
    </div>
  );
}
