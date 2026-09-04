// src/components/modals/ModalGerenciarGrupo.jsx
import React, { useState, useEffect } from "react";
import {
  X, Plus, Trash2, Users, Crown, Code2, Eye,
  ChevronDown, UserPlus, Loader2, Building2
} from "lucide-react";
import { ORANGE, BLACK, FONT } from "../../constants/theme";

const ROLE_CONFIG = {
  admin: { label: "Admin", icon: Crown, color: "#FE5000", bg: "rgba(254,80,0,0.12)" },
  dev:   { label: "Dev",   icon: Code2, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  member:{ label: "Membro",icon: Eye,   color: "#10B981", bg: "rgba(16,185,129,0.12)" },
};

function RoleBadge({ role, small }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.member;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: cfg.bg, color: cfg.color,
      borderRadius: 99, padding: small ? "2px 8px" : "4px 10px",
      fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}>
      <Icon size={small ? 10 : 12} />
      {cfg.label}
    </span>
  );
}

function RoleSelect({ value, onChange, disabled }) {
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          appearance: "none", background: "transparent",
          border: "1.5px solid #33352F", borderRadius: 8,
          padding: "4px 26px 4px 10px", fontSize: 12, fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer", color: "inherit",
          fontFamily: FONT,
        }}
      >
        <option value="admin">Admin</option>
        <option value="dev">Dev</option>
        <option value="member">Membro</option>
      </select>
      <ChevronDown size={12} style={{ position: "absolute", right: 8, pointerEvents: "none" }} />
    </div>
  );
}

export function ModalGerenciarGrupo({ tema, grupos = [], userRole, userId, onClose, onRefresh }) {
  const isDark = tema === "escuro";
  const bg = isDark ? "#1A1C19" : "#FFFFFF";
  const surfaceBg = isDark ? "#22241F" : "#F8F8F6";
  const border = isDark ? "#33352F" : "#E2E2DF";
  const textColor = isDark ? "#ECEDEB" : BLACK;
  const mutedColor = isDark ? "#9DA098" : "#6A6E69";

  const [abaAtiva, setAbaAtiva] = useState(grupos[0]?.id ?? "__novo__");
  const [novoGrupoNome, setNovoGrupoNome] = useState("");
  const [novoMembroEmail, setNovoMembroEmail] = useState("");
  const [novoMembroRole, setNovoMembroRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", tipo: "" });

  const grupoAtivo = grupos.find((g) => g.id === abaAtiva);
  const isAdminDoGrupo = grupoAtivo?.meu_role === "admin";

  function flash(text, tipo = "ok") {
    setMsg({ text, tipo });
    setTimeout(() => setMsg({ text: "", tipo: "" }), 3500);
  }

  async function criarGrupo() {
    if (!novoGrupoNome.trim()) return;
    setLoading(true);
    try {
      const token = sessionStorage.getItem("lob:auth_token") || localStorage.getItem("lob:auth_token");
      const res = await fetch("/api/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nome: novoGrupoNome.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash("Grupo criado com sucesso!");
      setNovoGrupoNome("");
      setAbaAtiva(data.id);
      onRefresh?.();
    } catch (e) {
      flash(e.message, "erro");
    } finally {
      setLoading(false);
    }
  }

  async function adicionarMembro() {
    if (!novoMembroEmail.trim() || !grupoAtivo) return;
    setLoading(true);
    try {
      const token = sessionStorage.getItem("lob:auth_token") || localStorage.getItem("lob:auth_token");
      const res = await fetch(`/api/grupos/${grupoAtivo.id}/membros`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: novoMembroEmail.trim(), role: novoMembroRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash("Membro adicionado!");
      setNovoMembroEmail("");
      onRefresh?.();
    } catch (e) {
      flash(e.message, "erro");
    } finally {
      setLoading(false);
    }
  }

  async function alterarRole(membroUserId, novoRole) {
    if (!grupoAtivo) return;
    setLoading(true);
    try {
      const token = sessionStorage.getItem("lob:auth_token") || localStorage.getItem("lob:auth_token");
      const res = await fetch(`/api/grupos/${grupoAtivo.id}/membros/${membroUserId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: novoRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash("Papel atualizado!");
      onRefresh?.();
    } catch (e) {
      flash(e.message, "erro");
    } finally {
      setLoading(false);
    }
  }

  async function removerMembro(membroUserId) {
    if (!grupoAtivo) return;
    setLoading(true);
    try {
      const token = sessionStorage.getItem("lob:auth_token") || localStorage.getItem("lob:auth_token");
      const res = await fetch(`/api/grupos/${grupoAtivo.id}/membros/${membroUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash("Membro removido.");
      onRefresh?.();
    } catch (e) {
      flash(e.message, "erro");
    } finally {
      setLoading(false);
    }
  }

  const membros = grupoAtivo?.membros ?? [];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 900,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: bg, borderRadius: 20, width: "100%", maxWidth: 680,
          maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          border: `1.5px solid ${border}`,
          fontFamily: FONT, color: textColor,
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(254,80,0,0.12)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Users size={18} color={ORANGE} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Gerenciar Grupos</div>
              <div style={{ fontSize: 11, color: mutedColor }}>
                Crie grupos e gerencie membros e permissões
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: mutedColor, padding: 6, borderRadius: 8,
              display: "flex", alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs: grupos + "Novo Grupo" */}
        <div style={{
          display: "flex", gap: 6, padding: "16px 24px 0",
          overflowX: "auto", borderBottom: `1.5px solid ${border}`,
        }}>
          {grupos.map((g) => (
            <button
              key={g.id}
              onClick={() => setAbaAtiva(g.id)}
              style={{
                background: abaAtiva === g.id ? ORANGE : "transparent",
                color: abaAtiva === g.id ? "#fff" : mutedColor,
                border: "none", cursor: "pointer", borderRadius: "8px 8px 0 0",
                padding: "8px 16px", fontSize: 13, fontWeight: 600,
                whiteSpace: "nowrap", fontFamily: FONT,
                transition: "all 0.15s",
              }}
            >
              {g.nome}
            </button>
          ))}
          <button
            onClick={() => setAbaAtiva("__novo__")}
            style={{
              background: abaAtiva === "__novo__" ? ORANGE : "transparent",
              color: abaAtiva === "__novo__" ? "#fff" : mutedColor,
              border: "none", cursor: "pointer", borderRadius: "8px 8px 0 0",
              padding: "8px 14px", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 5, fontFamily: FONT,
              transition: "all 0.15s",
            }}
          >
            <Plus size={14} /> Novo Grupo
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px" }}>

          {/* Flash message */}
          {msg.text && (
            <div style={{
              marginBottom: 16, padding: "10px 14px", borderRadius: 10,
              background: msg.tipo === "erro" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
              color: msg.tipo === "erro" ? "#EF4444" : "#10B981",
              fontSize: 13, fontWeight: 500,
            }}>
              {msg.text}
            </div>
          )}

          {/* Criar novo grupo */}
          {abaAtiva === "__novo__" && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                Criar novo grupo
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  placeholder="Nome do grupo (ex: Equipe Obra A)"
                  value={novoGrupoNome}
                  onChange={(e) => setNovoGrupoNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && criarGrupo()}
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 10,
                    border: `1.5px solid ${border}`, background: surfaceBg,
                    color: textColor, fontSize: 13, fontFamily: FONT,
                    outline: "none",
                  }}
                />
                <button
                  onClick={criarGrupo}
                  disabled={!novoGrupoNome.trim() || loading}
                  style={{
                    background: ORANGE, color: "#fff", border: "none",
                    borderRadius: 10, padding: "10px 18px", fontWeight: 700,
                    fontSize: 13, cursor: "pointer", display: "flex",
                    alignItems: "center", gap: 6, fontFamily: FONT,
                    opacity: !novoGrupoNome.trim() || loading ? 0.5 : 1,
                  }}
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Criar
                </button>
              </div>
              <p style={{ marginTop: 10, fontSize: 12, color: mutedColor }}>
                Você se tornará automaticamente <strong>Admin</strong> do grupo criado.
              </p>
            </div>
          )}

          {/* Membros do grupo ativo */}
          {abaAtiva !== "__novo__" && grupoAtivo && (
            <div>
              {/* Info do grupo */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 20,
              }}>
                <Building2 size={16} color={ORANGE} />
                <span style={{ fontSize: 15, fontWeight: 700 }}>{grupoAtivo.nome}</span>
                <RoleBadge role={grupoAtivo.meu_role} small />
              </div>

              {/* Lista de membros */}
              <div style={{ fontSize: 13, fontWeight: 600, color: mutedColor, marginBottom: 10 }}>
                {membros.length} membro{membros.length !== 1 ? "s" : ""}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {membros.map((m) => {
                  const email = m.perfil?.email ?? "—";
                  const nome = m.perfil?.nome ?? email;
                  const isSelf = m.perfil?.id === userId;
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        background: surfaceBg, borderRadius: 12,
                        padding: "12px 14px", border: `1.5px solid ${border}`,
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: ROLE_CONFIG[m.role]?.bg ?? "rgba(254,80,0,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700,
                        color: ROLE_CONFIG[m.role]?.color ?? ORANGE,
                        flexShrink: 0,
                      }}>
                        {email.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, truncate: true }}>
                          {nome} {isSelf && <span style={{ color: mutedColor, fontWeight: 400 }}>(você)</span>}
                        </div>
                        <div style={{ fontSize: 11, color: mutedColor }}>{email}</div>
                      </div>
                      {/* Role select */}
                      {isAdminDoGrupo && !isSelf ? (
                        <RoleSelect
                          value={m.role}
                          onChange={(r) => alterarRole(m.perfil?.id, r)}
                          disabled={loading}
                        />
                      ) : (
                        <RoleBadge role={m.role} small />
                      )}
                      {/* Remover */}
                      {isAdminDoGrupo && !isSelf && (
                        <button
                          onClick={() => removerMembro(m.perfil?.id)}
                          disabled={loading}
                          title="Remover membro"
                          style={{
                            background: "transparent", border: "none",
                            cursor: "pointer", color: "#EF4444",
                            padding: 4, borderRadius: 6, display: "flex",
                            opacity: loading ? 0.4 : 1,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Adicionar membro */}
              {isAdminDoGrupo && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <UserPlus size={14} color={ORANGE} /> Adicionar membro
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      placeholder="Email do usuário"
                      value={novoMembroEmail}
                      onChange={(e) => setNovoMembroEmail(e.target.value)}
                      type="email"
                      style={{
                        flex: "1 1 200px", padding: "10px 14px", borderRadius: 10,
                        border: `1.5px solid ${border}`, background: surfaceBg,
                        color: textColor, fontSize: 13, fontFamily: FONT, outline: "none",
                      }}
                    />
                    <select
                      value={novoMembroRole}
                      onChange={(e) => setNovoMembroRole(e.target.value)}
                      style={{
                        padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${border}`,
                        background: surfaceBg, color: textColor, fontSize: 13,
                        fontFamily: FONT, cursor: "pointer",
                      }}
                    >
                      <option value="member">Membro</option>
                      <option value="dev">Dev</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={adicionarMembro}
                      disabled={!novoMembroEmail.trim() || loading}
                      style={{
                        background: ORANGE, color: "#fff", border: "none",
                        borderRadius: 10, padding: "10px 18px", fontWeight: 700,
                        fontSize: 13, cursor: "pointer", display: "flex",
                        alignItems: "center", gap: 6, fontFamily: FONT,
                        opacity: !novoMembroEmail.trim() || loading ? 0.5 : 1,
                      }}
                    >
                      {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                      Adicionar
                    </button>
                  </div>
                  <p style={{ marginTop: 8, fontSize: 11, color: mutedColor }}>
                    O usuário precisa já ter uma conta cadastrada no sistema.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
