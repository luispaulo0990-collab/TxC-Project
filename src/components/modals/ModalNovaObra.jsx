import React, { useState } from "react";
import { X, Building2, MapPin, Calendar, AlertCircle, Briefcase } from "lucide-react";
import { ORANGE, BLACK, FONT } from "../../constants/theme";
import { uid } from "../../utils/dateUtils";

/* ─── Campo de formulário ────────────────────────────────────── */
function Campo({ label, icon: Icon, erro, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{
        fontSize: 12, fontWeight: 600,
        color: erro ? "#D64545" : "#6A6E69",
        display: "flex", alignItems: "center", gap: 6,
        textTransform: "uppercase", letterSpacing: 0.5,
      }}>
        {Icon && <Icon size={12} />} {label}
        {erro && <span style={{ color: "#D64545", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— {erro}</span>}
      </label>
      {children}
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────── */
export function ModalNovaObra({ T, tema, onClose, onCriar }) {
  const [nome, setNome]                 = useState("");
  const [incorporador, setIncorporador] = useState("");
  const [endereco, setEndereco]         = useState("");
  const [dataZero, setDataZero]         = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [erroNome, setErroNome] = useState("");

  const isDark = tema === "escuro";
  const inputStyle = {
    background: isDark ? "#22241F" : "#F5F5F3",
    border: `1.5px solid ${isDark ? "#33352F" : "#DEDEDB"}`,
    borderRadius: 8, padding: "10px 14px",
    fontSize: 14, color: isDark ? "#ECEDEB" : BLACK,
    outline: "none", width: "100%",
    fontFamily: FONT, transition: "border-color 0.15s",
    boxSizing: "border-box",
  };

  const handleCriar = () => {
    if (!nome.trim()) {
      setErroNome("obrigatório");
      return;
    }
    setErroNome("");
    const novoProjeto = {
      id: uid(),
      nome: nome.trim(),
      incorporador: incorporador.trim(),
      endereco: endereco.trim(),
      tipo: "Predial Vertical",
      dataZero: dataZero || new Date().toISOString().slice(0, 10),
      torres: [],
      locais: [],
      atividades: [],
      marcos: [],
    };
    onCriar(novoProjeto);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, fontFamily: FONT,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: isDark ? "#1A1C19" : "#FFFFFF",
        borderRadius: 18,
        width: "100%", maxWidth: 480,
        boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}>
        {/* ─ Cabeçalho ─ */}
        <div style={{
          background: BLACK, padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: ORANGE, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Building2 size={18} color="#fff" />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Nova Obra</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1 }}>
                Configure o empreendimento
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)", border: "none",
              color: "#fff", cursor: "pointer", borderRadius: 8,
              width: 32, height: 32, display: "flex",
              alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.16)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
          >
            <X size={16} />
          </button>
        </div>

        {/* ─ Formulário ─ */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Nome */}
          <Campo label="Nome da Obra" icon={Building2} erro={erroNome}>
            <input
              value={nome}
              onChange={(e) => { setNome(e.target.value); setErroNome(""); }}
              placeholder="Ex: Residencial Artur Alvim"
              style={{
                ...inputStyle,
                borderColor: erroNome ? "#D64545" : (isDark ? "#33352F" : "#DEDEDB"),
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = ORANGE}
              onBlur={(e) => e.currentTarget.style.borderColor = erroNome ? "#D64545" : (isDark ? "#33352F" : "#DEDEDB")}
              autoFocus
            />
            {erroNome && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#D64545", fontSize: 12 }}>
                <AlertCircle size={12} /> Informe o nome da obra para continuar
              </div>
            )}
          </Campo>

          {/* Incorporador */}
          <Campo label="Incorporador(a)" icon={Briefcase}>
            <input
              value={incorporador}
              onChange={(e) => setIncorporador(e.target.value)}
              placeholder="Ex: Cyrela, Trisul, MRV, Mitre..."
              style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = ORANGE}
              onBlur={(e) => e.currentTarget.style.borderColor = isDark ? "#33352F" : "#DEDEDB"}
            />
          </Campo>

          {/* Endereço */}
          <Campo label="Endereço / Localização" icon={MapPin}>
            <input
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Ex: Rua dos Bandeirantes, 120 — São Paulo, SP"
              style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = ORANGE}
              onBlur={(e) => e.currentTarget.style.borderColor = isDark ? "#33352F" : "#DEDEDB"}
            />
          </Campo>

          {/* Data de início */}
          <Campo label="Data de Início do Cronograma" icon={Calendar}>
            <input
              type="date"
              value={dataZero}
              onChange={(e) => setDataZero(e.target.value)}
              style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = ORANGE}
              onBlur={(e) => e.currentTarget.style.borderColor = isDark ? "#33352F" : "#DEDEDB"}
            />
          </Campo>
        </div>

        {/* ─ Rodapé ─ */}
        <div style={{
          padding: "0 24px 24px",
          display: "flex", gap: 10, justifyContent: "flex-end",
        }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1.5px solid ${isDark ? "#33352F" : "#DEDEDB"}`,
              color: isDark ? "#9DA098" : "#6A6E69",
              padding: "10px 20px", borderRadius: 9,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: FONT, transition: "all 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = isDark ? "#63665F" : "#A6A8A3"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = isDark ? "#33352F" : "#DEDEDB"}
          >
            Cancelar
          </button>
          <button
            onClick={handleCriar}
            style={{
              background: ORANGE, border: "none",
              color: "#fff", padding: "10px 24px",
              borderRadius: 9, fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: FONT,
              transition: "filter 0.15s",
              display: "flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
            onMouseLeave={(e) => e.currentTarget.style.filter = "brightness(1)"}
          >
            <Building2 size={14} /> Criar Obra
          </button>
        </div>
      </div>
    </div>
  );
}
