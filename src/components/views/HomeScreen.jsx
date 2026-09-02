import React, { useState } from "react";
import { Plus, Building2, Trash2, Calendar, Layers, ChevronRight, FolderOpen, LogOut, User } from "lucide-react";
import { ORANGE, BLACK, P447, COOL2, FONT } from "../../constants/theme";

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
function ObraCard({ obra, isAtiva, onClick, onExcluir, tema }) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isDark = tema === "escuro";
  const bg = isDark
    ? hovered ? "#22241F" : "#1A1C19"
    : hovered ? "#F0F0EE" : "#FFFFFF";
  const border = isAtiva ? ORANGE : (isDark ? "#33352F" : "#E2E2DF");
  const textColor = isDark ? "#ECEDEB" : BLACK;
  const mutedColor = isDark ? "#9DA098" : "#6A6E69";

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirmDelete) {
      onExcluir();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
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
      }}
    >
      {/* Badge "Ativa" */}
      {isAtiva && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: ORANGE, color: "#fff",
          fontSize: 10, fontWeight: 700, letterSpacing: 1,
          padding: "2px 8px", borderRadius: 99,
          textTransform: "uppercase",
        }}>
          Ativa
        </div>
      )}

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

      {/* Botão excluir */}
      <button
        onClick={handleDelete}
        title={confirmDelete ? "Clique novamente para confirmar" : "Excluir obra"}
        style={{
          position: "absolute", bottom: 14, right: 14,
          background: confirmDelete ? "#D64545" : "transparent",
          border: "none", cursor: "pointer",
          padding: "4px 8px", borderRadius: 6,
          display: "flex", alignItems: "center", gap: 5,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.15s, background 0.15s",
          color: confirmDelete ? "#fff" : "#D64545",
          fontSize: 11, fontWeight: 600,
        }}
      >
        <Trash2 size={13} />
        {confirmDelete ? "Confirmar?" : "Excluir"}
      </button>

      {/* Seta hover */}
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
export function HomeScreen({ salvos, projAtualId, tema, user, onLogout, onSelecionarObra, onNovaObra, onExcluirObra }) {
  const isDark = tema === "escuro";
  const bg = isDark ? "#111310" : "#ECEDEB";
  const textColor = isDark ? "#ECEDEB" : BLACK;
  const mutedColor = isDark ? "#9DA098" : "#6A6E69";
  const subtleColor = isDark ? "#1A1C19" : "#FFFFFF";

  const temObras = salvos.length > 0;

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
        <div
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: ORANGE, display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "#fff",
          }}
        >
          <Layers size={16} />
        </div>
        <span style={{
          fontSize: 12, letterSpacing: 2, fontWeight: 700,
          color: "#fff", textTransform: "uppercase",
        }}>
          Tempo × Caminho
        </span>

        {user && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
              <User size={14} color="rgba(255,255,255,0.5)" />
              <span>{user.email}</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  transition: "background 0.15s ease",
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

        {/* Saudação */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontSize: 28, fontWeight: 800, color: textColor,
            margin: 0, letterSpacing: -0.5, lineHeight: 1.2,
          }}>
            Suas Obras
          </h1>
          <p style={{ fontSize: 14, color: mutedColor, marginTop: 6 }}>
            {temObras
              ? `${salvos.length} ${salvos.length === 1 ? "empreendimento salvo" : "empreendimentos salvos"} · selecione para abrir`
              : "Nenhuma obra criada ainda · comece criando sua primeira obra"}
          </p>
        </div>

        {/* Grid de obras */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}>
          {/* Card nova obra sempre primeiro */}
          <NovaObraCard onClick={onNovaObra} tema={tema} />

          {/* Cards das obras existentes */}
          {salvos.map((obra) => (
            <ObraCard
              key={obra.id}
              obra={obra}
              isAtiva={obra.id === projAtualId}
              onClick={() => onSelecionarObra(obra.id)}
              onExcluir={() => onExcluirObra(obra.id)}
              tema={tema}
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
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: textColor }}>
                Comece criando sua primeira obra
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: mutedColor }}>
                Clique em <strong style={{ color: ORANGE }}>+ Nova Obra</strong> para configurar um novo empreendimento com torres, pavimentos e atividades.
              </p>
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
