import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Building2, Trash2, Calendar, Layers, ChevronRight,
  LogOut, LogIn, User, Crown, Code2, Eye, Archive, ArchiveRestore,
  Expand, Minimize, Folder, FolderPlus, FolderInput, Pencil, Home, X, Check,
} from "lucide-react";
import {
  ORANGE, ORANGE_HOVER, INK, FONT, FONT_DISPLAY, THEME, RADIUS, SHADOW, OVERLAY, STATUS,
} from "../../constants/theme";
import { calcularPermissao } from "../../hooks/usePermissao";
import { LogoUnita, SimboloUn } from "../common/LogoUnita";

const ROLE_CONFIG = {
  admin:  { label: "Admin",  icon: Crown, color: ORANGE,         bg: "rgb(254 80 0 / 0.16)" },
  dev:    { label: "Dev",    icon: Code2, color: "#8DB7E8",      bg: "rgb(37 99 168 / 0.28)" },
  member: { label: "Membro", icon: Eye,   color: "#7FCB9E",      bg: "rgb(30 138 76 / 0.24)" },
};

function RoleBadge({ role }) {
  const cfg = (role && ROLE_CONFIG[role]) ? ROLE_CONFIG[role] : ROLE_CONFIG.admin;
  const Icon = cfg.icon || Crown;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: cfg.bg, color: cfg.color,
      borderRadius: 999, padding: "2px 10px",
      fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
    }}>
      <Icon size={12} />
      {cfg.label}
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

/* ─── Botões v2 ──────────────────────────────────────────────── */
function Btn({ variant = "secondary", size = "md", T, children, style, ...props }) {
  const [hover, setHover] = useState(false);
  const h = size === "sm" ? 34 : 40;
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
    height: h, padding: size === "sm" ? "0 12px" : "0 16px",
    borderRadius: RADIUS.control, fontFamily: FONT, fontSize: size === "sm" ? 13.5 : 14.5, fontWeight: 500,
    cursor: props.disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
    border: "1px solid transparent", transition: "background .15s, border-color .15s, color .15s",
    opacity: props.disabled ? 0.55 : 1,
  };
  const v = {
    primary: { background: hover ? ORANGE_HOVER : ORANGE, color: "#fff", boxShadow: "0 2px 8px rgb(254 80 0 / 0.2)" },
    secondary: { background: hover ? T.raised : T.panel, color: T.text, borderColor: hover ? T.dim : T.line },
    ghost: { background: hover ? T.hover : "transparent", color: T.text },
    danger: { background: hover ? "#A82222" : STATUS.error, color: "#fff" },
    inverse: { background: hover ? "rgb(255 255 255 / 0.1)" : "transparent", color: hover ? "#fff" : "#E2DFDC" },
  }[variant];
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...v, ...style }}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─── Menu "Mover para pasta" ───────────────────────────────── */
function MenuMoverPasta({ T, pastas, pastaAtualId, onEscolher, onFechar }) {
  const ref = useRef(null);
  useEffect(() => {
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) onFechar(); };
    const esc = (e) => { if (e.key === "Escape") onFechar(); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [onFechar]);

  const item = (id, label, icon, nivel = 0) => {
    const atual = (pastaAtualId || null) === (id || null);
    return (
      <button
        key={id || "raiz"}
        disabled={atual}
        onClick={(e) => { e.stopPropagation(); onEscolher(id); }}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: `7px 10px 7px ${10 + nivel * 14}px`, borderRadius: 8, border: "none",
          background: "transparent", color: atual ? T.dim : T.text,
          fontSize: 13.5, fontFamily: FONT, textAlign: "left",
          cursor: atual ? "default" : "pointer",
        }}
        onMouseEnter={(e) => { if (!atual) e.currentTarget.style.background = T.hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        {icon}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {atual && <Check size={13} color={ORANGE} />}
      </button>
    );
  };

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute", right: 0, bottom: "calc(100% + 6px)", zIndex: 40,
        width: 250, maxHeight: 280, overflowY: "auto",
        background: T.panel, border: `1px solid ${T.line}`, borderRadius: 12,
        boxShadow: SHADOW.overlay, padding: 6,
      }}
    >
      <div style={{ fontSize: 12, color: T.muted, padding: "4px 10px 6px" }}>Mover para</div>
      {item(null, "Suas Obras (sem pasta)", <Home size={14} color={T.muted} />)}
      {/* pastas: [{ pasta, nivel }] em ordem de árvore (subpastas recuadas) */}
      {pastas.map(({ pasta, nivel }) => item(pasta.id, pasta.nome, <Folder size={14} color={ORANGE} />, nivel))}
      {pastas.length === 0 && (
        <div style={{ fontSize: 12.5, color: T.dim, padding: "6px 10px" }}>Nenhuma pasta criada ainda.</div>
      )}
    </div>
  );
}

/* ─── Card de Obra ───────────────────────────────────────────── */
function ObraCard({
  obra, isAtiva, onClick, onExcluir, onArquivar, T,
  podeExcluir, podeMover, pastas, pastaAtualId, onMover,
}) {
  const [hovered, setHovered] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const mostrarAcoes = podeExcluir || podeMover;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      draggable={podeMover}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/obra-id", String(obra.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      style={{
        background: T.panel,
        border: `1px solid ${isAtiva ? ORANGE : T.lineSoft}`,
        borderRadius: RADIUS.card,
        padding: "16px 18px 12px",
        cursor: "pointer",
        transition: "box-shadow .18s ease, transform .18s ease, border-color .18s ease",
        position: "relative",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? T.shadowHover : T.shadow,
        fontFamily: FONT,
        minHeight: 158,
        display: "flex",
        flexDirection: "column",
        opacity: obra.arquivado ? 0.82 : 1,
      }}
    >
      {/* Selos: Ativa e/ou Arquivada */}
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 6 }}>
        {obra.arquivado && (
          <span style={{
            background: T.hover, color: T.muted,
            fontSize: 12, fontWeight: 500,
            padding: "2px 9px", borderRadius: 999,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <Archive size={11} />
            Arquivada
          </span>
        )}
        {isAtiva && (
          <span style={{
            background: T.primarySoft, color: ORANGE,
            fontSize: 12, fontWeight: 600,
            padding: "2px 9px", borderRadius: 999,
          }}>
            Ativa
          </span>
        )}
      </div>

      {/* Ícone + Nome */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: RADIUS.control, flexShrink: 0,
          background: isAtiva ? ORANGE : T.primarySoft,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Building2 size={19} color={isAtiva ? "#fff" : ORANGE} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600, fontSize: 15, color: T.text,
            overflowWrap: "anywhere",
            lineHeight: 1.3,
            paddingRight: obra.arquivado && isAtiva ? 140 : obra.arquivado ? 92 : isAtiva ? 48 : 0,
          }}>
            {obra.nome || "Obra sem nome"}
          </div>
          {obra.incorporador && (
            <div style={{ fontSize: 12.5, fontWeight: 500, color: ORANGE, marginTop: 2 }}>
              {obra.incorporador}
            </div>
          )}
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            {dataRelativa(obra.em)}
          </div>
        </div>
      </div>

      {/* Indicadores */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto", flexWrap: "wrap" }}>
        {obra.nTorres != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Layers size={13} color={T.muted} />
            <span style={{ fontSize: 12.5, color: T.muted, fontVariantNumeric: "tabular-nums" }}>
              {obra.nTorres} {obra.nTorres === 1 ? "torre" : "torres"}
            </span>
          </div>
        )}
        {obra.nAtividades != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Calendar size={13} color={T.muted} />
            <span style={{ fontSize: 12.5, color: T.muted, fontVariantNumeric: "tabular-nums" }}>
              {obra.nAtividades} {obra.nAtividades === 1 ? "atividade" : "atividades"}
            </span>
          </div>
        )}
      </div>

      {/* Ações de gerenciamento: Mover (Dev/Admin) · Arquivar e Excluir (Dev) */}
      {mostrarAcoes && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: `1px solid ${T.lineSoft}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flexWrap: "wrap",
            gap: 4,
            position: "relative",
            opacity: hovered || menuAberto ? 1 : 0,
            pointerEvents: hovered || menuAberto ? "auto" : "none",
            transition: "opacity 0.15s ease",
          }}
        >
          {podeMover && (
            <AcaoBtn T={T} title="Mover para outra pasta" onClick={() => setMenuAberto((v) => !v)}>
              <FolderInput size={12} />
              <span>Mover</span>
            </AcaoBtn>
          )}
          {menuAberto && (
            <MenuMoverPasta
              T={T}
              pastas={pastas}
              pastaAtualId={pastaAtualId}
              onFechar={() => setMenuAberto(false)}
              onEscolher={(pid) => { setMenuAberto(false); onMover(pid); }}
            />
          )}

          {podeExcluir && onArquivar && (
            <AcaoBtn
              T={T}
              title={obra.arquivado ? "Reativar obra (desarquivar)" : "Arquivar obra"}
              onClick={() => onArquivar(obra.id, !obra.arquivado)}
            >
              {obra.arquivado ? <ArchiveRestore size={12} /> : <Archive size={12} />}
              <span>{obra.arquivado ? "Reativar" : "Arquivar"}</span>
            </AcaoBtn>
          )}

          {podeExcluir && (
            <AcaoBtn T={T} danger title="Excluir obra permanentemente" onClick={onExcluir}>
              <Trash2 size={12} />
              <span>Excluir</span>
            </AcaoBtn>
          )}
        </div>
      )}

      {/* Seta hover para visualizadores */}
      {!mostrarAcoes && (
        <ChevronRight
          size={18}
          style={{
            position: "absolute", right: 16, bottom: 14,
            color: isAtiva ? ORANGE : T.muted,
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s, transform 0.15s",
            transform: hovered ? "translateX(3px)" : "translateX(0)",
          }}
        />
      )}
    </div>
  );
}

function AcaoBtn({ T, danger = false, children, onClick, title }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      title={title}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, whiteSpace: "nowrap",
        height: 28, padding: "0 7px", borderRadius: 8,
        border: `1px solid ${danger ? "transparent" : T.line}`,
        background: danger ? (h ? STATUS.error : STATUS.errorSoft) : (h ? T.hover : T.panel),
        color: danger ? (h ? "#fff" : STATUS.error) : T.text,
        fontSize: 12, fontWeight: 500, fontFamily: FONT, cursor: "pointer",
        transition: "background .15s, color .15s",
      }}
    >
      {children}
    </button>
  );
}

/* ─── Card de Pasta ─────────────────────────────────────────── */
function PastaCard({ pasta, qtd, qtdSub = 0, T, onAbrir, podeMover, onSoltarObra }) {
  const [hovered, setHovered] = useState(false);
  const [alvo, setAlvo] = useState(false);
  return (
    <div
      onClick={onAbrir}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragOver={(e) => {
        if (!podeMover || !e.dataTransfer.types.includes("text/obra-id")) return;
        e.preventDefault();
        setAlvo(true);
      }}
      onDragLeave={() => setAlvo(false)}
      onDrop={(e) => {
        setAlvo(false);
        const id = e.dataTransfer.getData("text/obra-id");
        if (id) { e.preventDefault(); onSoltarObra(id); }
      }}
      title={podeMover ? "Abrir pasta · arraste uma obra até aqui para movê-la" : "Abrir pasta"}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        background: alvo ? T.primarySoft : T.panel,
        border: `1px ${alvo ? "dashed" : "solid"} ${alvo ? ORANGE : T.lineSoft}`,
        borderRadius: RADIUS.card,
        padding: "14px 16px",
        cursor: "pointer",
        boxShadow: hovered ? T.shadowHover : T.shadow,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "box-shadow .18s ease, transform .18s ease, background .15s",
        fontFamily: FONT,
        minWidth: 0,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: RADIUS.control, flexShrink: 0,
        background: T.primarySoft, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Folder size={19} color={ORANGE} fill={ORANGE} fillOpacity={0.18} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pasta.nome}
        </div>
        <div style={{ fontSize: 12.5, color: T.muted, fontVariantNumeric: "tabular-nums" }}>
          {qtd} {qtd === 1 ? "obra" : "obras"}
          {qtdSub > 0 && ` · ${qtdSub} ${qtdSub === 1 ? "subpasta" : "subpastas"}`}
        </div>
      </div>
      <ChevronRight size={16} color={T.muted} style={{ opacity: hovered ? 1 : 0.4, transition: "opacity .15s" }} />
    </div>
  );
}

/* ─── Card "Nova Obra" ───────────────────────────────────────── */
function NovaObraCard({ onClick, T }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1.5px dashed ${hovered ? ORANGE : T.gridMes}`,
        borderRadius: RADIUS.card,
        padding: "16px 18px",
        cursor: "pointer",
        transition: "all 0.18s ease",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: 158, gap: 10,
        background: hovered ? T.primarySoft : "transparent",
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: RADIUS.control,
        background: hovered ? ORANGE : T.hover,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.18s",
      }}>
        <Plus size={22} color={hovered ? "#fff" : T.muted} />
      </div>
      <span style={{
        fontSize: 14, fontWeight: 500,
        color: hovered ? ORANGE : T.muted,
        transition: "color 0.18s",
        fontFamily: FONT,
      }}>
        Nova Obra
      </span>
    </div>
  );
}

/* ─── Modal de pasta (criar / renomear) ─────────────────────── */
function ModalPasta({ T, modo, nomeInicial = "", sugestoes = [], pastaMaeNome = null, onSalvar, onFechar }) {
  const [nome, setNome] = useState(nomeInicial);
  const [moverIncorp, setMoverIncorp] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const sugestaoEscolhida = sugestoes.find((s) => s.nome.toLowerCase() === nome.trim().toLowerCase());

  const salvar = async () => {
    if (!nome.trim()) { setErro("Informe o nome da pasta."); return; }
    setSalvando(true);
    setErro("");
    try {
      await onSalvar(nome.trim(), modo === "criar" && sugestaoEscolhida && moverIncorp ? sugestaoEscolhida.obraIds : []);
    } catch (e) {
      setErro(e?.message || "Não foi possível salvar a pasta.");
      setSalvando(false);
    }
  };

  return (
    <div
      onClick={onFechar}
      style={{ position: "fixed", inset: 0, background: OVERLAY, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 460, background: T.panel, color: T.text,
          borderRadius: RADIUS.card, boxShadow: SHADOW.overlay, border: `1px solid ${T.lineSoft}`,
          padding: "20px 22px", fontFamily: FONT,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, margin: 0 }}>
            {modo === "criar" ? (pastaMaeNome ? "Nova subpasta" : "Nova pasta") : "Renomear pasta"}
          </h2>
          <button onClick={onFechar} style={{ border: "none", background: "transparent", color: T.muted, cursor: "pointer", lineHeight: 0, padding: 6, borderRadius: 8 }}>
            <X size={16} />
          </button>
        </div>

        {modo === "criar" && pastaMaeNome && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: T.muted, marginBottom: 12 }}>
            <Folder size={14} color={ORANGE} />
            Dentro de <strong style={{ color: T.text, fontWeight: 500 }}>{pastaMaeNome}</strong>
          </div>
        )}
        <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: T.muted, marginBottom: 6 }}>
          Nome da pasta
        </label>
        <input
          ref={inputRef}
          value={nome}
          onChange={(e) => { setNome(e.target.value); setErro(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") onFechar(); }}
          placeholder="Ex.: Cyrela, Trisul, Residencial Artur Alvim…"
          style={{
            width: "100%", height: 42, borderRadius: RADIUS.control,
            border: `1px solid ${erro ? STATUS.error : T.line}`, background: T.input, color: T.text,
            padding: "0 14px", fontSize: 15, fontFamily: FONT, outline: "none",
          }}
        />
        {erro && <div style={{ fontSize: 13, color: STATUS.error, marginTop: 6 }}>{erro}</div>}

        {modo === "criar" && sugestoes.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>
              Sugestões por incorporador (obras ainda sem pasta)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {sugestoes.map((s) => {
                const ativo = sugestaoEscolhida?.nome === s.nome;
                return (
                  <button
                    key={s.nome}
                    onClick={() => setNome(s.nome)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      height: 30, padding: "0 12px", borderRadius: 999,
                      border: `1px solid ${ativo ? ORANGE : T.line}`,
                      background: ativo ? T.primarySoft : T.panel,
                      color: ativo ? ORANGE : T.text,
                      fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: "pointer",
                    }}
                  >
                    {s.nome}
                    <span style={{ fontSize: 12, color: ativo ? ORANGE : T.muted, fontVariantNumeric: "tabular-nums" }}>{s.obraIds.length}</span>
                  </button>
                );
              })}
            </div>
            {sugestaoEscolhida && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13.5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={moverIncorp}
                  onChange={(e) => setMoverIncorp(e.target.checked)}
                  style={{ accentColor: ORANGE, width: 16, height: 16 }}
                />
                Mover as {sugestaoEscolhida.obraIds.length} {sugestaoEscolhida.obraIds.length === 1 ? "obra" : "obras"} de “{sugestaoEscolhida.nome}” para esta pasta
              </label>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Btn T={T} variant="secondary" onClick={onFechar}>Cancelar</Btn>
          <Btn T={T} variant="primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : modo === "criar" ? "Criar pasta" : "Salvar"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ─── Tela Principal ─────────────────────────────────────────── */
export function HomeScreen({
  salvos, projAtualId, tema, user, userRole,
  onLogout, onSelecionarObra, onNovaObra, onExcluirObra, onArquivarObra,
  onAbrirLogin, telaCheia = false, onAlternarTelaCheia,
  pastas = [], vinculosPasta = {},
  onCriarPasta, onRenomearPasta, onExcluirPasta, onMoverObras,
}) {
  const [filtroAba, setFiltroAba] = useState("ativas"); // "ativas" | "arquivadas" | "todas"
  const [pastaAtualId, setPastaAtualId] = useState(null);
  const [modalPasta, setModalPasta] = useState(null); // null | "criar" | "renomear"
  const [alvoRaiz, setAlvoRaiz] = useState(false);

  const T = THEME[tema] || THEME.claro;

  const perm = calcularPermissao(userRole);
  const podeExcluir = perm.podeExcluir; // Apenas Dev pode apagar e arquivar obras
  const podeCriar   = perm.podeCriar;   // Dev e Admin podem criar obras e organizar pastas
  const podeMover   = perm.podeOrganizarPastas && typeof onMoverObras === "function"; // Dev e Admin organizam pastas

  const listaPastas = Array.isArray(pastas) ? pastas : [];
  const idsPastas = useMemo(() => new Set(listaPastas.map((p) => p.id)), [listaPastas]);
  const pastaDe = (obraId) => {
    const pid = vinculosPasta?.[obraId];
    return pid && idsPastas.has(pid) ? pid : null;
  };
  const pastaAtual = listaPastas.find((p) => p.id === pastaAtualId) || null;

  // Hierarquia: parent_id ausente/inválido = pasta na raiz
  const paiDe = (p) => (p?.parent_id && p.parent_id !== p.id && idsPastas.has(p.parent_id) ? p.parent_id : null);
  const subpastasDe = (pid) => listaPastas.filter((p) => paiDe(p) === (pid || null));
  const subpastasNivel = subpastasDe(pastaAtualId);

  // Caminho da raiz até a pasta aberta (para o breadcrumb)
  const caminhoAtual = useMemo(() => {
    const porId = new Map(listaPastas.map((p) => [p.id, p]));
    const cadeia = [];
    const vistos = new Set();
    let p = pastaAtual;
    while (p && !vistos.has(p.id)) {
      vistos.add(p.id);
      cadeia.unshift(p);
      p = porId.get(paiDe(p));
    }
    return cadeia;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listaPastas, pastaAtual]);

  // Todas as pastas em ordem de árvore, com nível (para o menu "Mover para")
  const pastasEmArvore = useMemo(() => {
    const saida = [];
    const vistos = new Set();
    const visitar = (pid, nivel) => {
      listaPastas.filter((p) => paiDe(p) === pid).forEach((p) => {
        if (vistos.has(p.id)) return;
        vistos.add(p.id);
        saida.push({ pasta: p, nivel });
        visitar(p.id, nivel + 1);
      });
    };
    visitar(null, 0);
    return saida;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listaPastas]);

  // Se a pasta aberta deixou de existir, volta para a raiz
  useEffect(() => {
    if (pastaAtualId && !pastaAtual) setPastaAtualId(null);
  }, [pastaAtualId, pastaAtual]);

  // Separação de obras por status de arquivamento
  const todasObras = Array.isArray(salvos) ? salvos : [];
  const obrasAtivas = todasObras.filter((o) => !o.arquivado);
  const obrasArquivadas = todasObras.filter((o) => !!o.arquivado);

  const obrasDaAba =
    filtroAba === "ativas"
      ? obrasAtivas
      : filtroAba === "arquivadas"
      ? obrasArquivadas
      : todasObras;

  // Obras do nível atual (raiz = sem pasta; dentro da pasta = só as dela)
  const obrasExibidas = obrasDaAba.filter((o) => pastaDe(o.id) === (pastaAtualId || null));
  const qtdPorPasta = (pid) => obrasDaAba.filter((o) => pastaDe(o.id) === pid).length;

  // Contagens das abas respeitam o nível atual
  const noNivel = (lista) => lista.filter((o) => pastaDe(o.id) === (pastaAtualId || null)).length;

  const temObras = obrasExibidas.length > 0;
  const mostrarPastas = subpastasNivel.length > 0;

  // Sugestões: incorporadores das obras ainda sem pasta
  const sugestoes = useMemo(() => {
    const mapa = new Map();
    todasObras.forEach((o) => {
      const inc = (o.incorporador || "").trim();
      if (!inc || pastaDe(o.id)) return;
      const k = inc.toLowerCase();
      if (!mapa.has(k)) mapa.set(k, { nome: inc, obraIds: [] });
      mapa.get(k).obraIds.push(o.id);
    });
    const nomesPastas = new Set(listaPastas.map((p) => p.nome.trim().toLowerCase()));
    return [...mapa.values()]
      .filter((s) => !nomesPastas.has(s.nome.toLowerCase()))
      .sort((a, b) => b.obraIds.length - a.obraIds.length || a.nome.localeCompare(b.nome, "pt-BR"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todasObras, listaPastas, vinculosPasta]);

  const excluirPastaAtual = () => {
    if (!pastaAtual || !onExcluirPasta) return;
    onExcluirPasta(pastaAtual);
  };

  return (
    <div style={{
      height: "100vh", overflowY: "auto", background: T.bg, fontFamily: FONT,
      color: T.text, display: "flex", flexDirection: "column",
    }}>
      {/* ── Barra superior (grafite · borda laranja) ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        background: INK, color: "#fff",
        borderBottom: `2px solid ${ORANGE}`,
        padding: "0 24px", minHeight: 64,
        display: "flex", alignItems: "center", gap: 14,
        flexShrink: 0,
      }}>
        <LogoUnita ink="#fff" height={30} />
        <span style={{ width: 1, height: 26, background: "rgb(255 255 255 / 0.16)" }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: "#fff", letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
          Tempo × Caminho
        </span>
        <span style={{ fontSize: 13, color: "#A19B96", whiteSpace: "nowrap" }} className="hidden md:inline">
          Linha de Balanço
        </span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <>
              {userRole && <RoleBadge role={userRole} />}
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#E2DFDC" }}>
                <User size={15} color="#A19B96" />
                <span>{user.email || user.user_metadata?.email || "Usuário"}</span>
              </div>
              {onLogout && (
                <Btn T={T} variant="inverse" size="sm" onClick={onLogout} title="Desconectar do sistema">
                  <LogOut size={14} />
                  <span>Sair</span>
                </Btn>
              )}
            </>
          ) : (
            <>
              <span style={{
                fontSize: 12.5, color: "#C9C4C0",
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "rgb(255 255 255 / 0.08)",
                padding: "3px 10px", borderRadius: 999,
              }}>
                <Eye size={13} color="#7FCB9E" />
                Acesso Visualizador
              </span>
              {onAbrirLogin && (
                <Btn T={T} variant="primary" size="sm" onClick={onAbrirLogin} title="Entrar com a sua conta">
                  <LogIn size={14} />
                  <span>Entrar</span>
                </Btn>
              )}
            </>
          )}

          {onAlternarTelaCheia && (
            <Btn
              T={T}
              variant={telaCheia ? "primary" : "inverse"}
              size="sm"
              onClick={onAlternarTelaCheia}
              title={telaCheia ? "Sair da tela cheia (Esc)" : "Expandir o app para tela cheia"}
            >
              {telaCheia ? <Minimize size={14} /> : <Expand size={14} />}
              <span>{telaCheia ? "Sair da Tela Cheia" : "Tela Cheia"}</span>
            </Btn>
          )}
        </div>
      </header>

      {/* ── Conteúdo ── */}
      <main style={{
        flex: "1 0 auto", maxWidth: 1180, width: "100%",
        margin: "0 auto", padding: "28px 24px 40px",
      }}>
        {/* Navegação de pastas (breadcrumb) */}
        {pastaAtual && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 13.5, flexWrap: "wrap" }}>
            {[{ id: null, nome: "Suas Obras" }, ...caminhoAtual.slice(0, -1)].map((p) => {
              const alvo = alvoRaiz === (p.id || "raiz");
              return (
                <React.Fragment key={p.id || "raiz"}>
                  <button
                    onClick={() => setPastaAtualId(p.id)}
                    onDragOver={(e) => {
                      if (!podeMover || !e.dataTransfer.types.includes("text/obra-id")) return;
                      e.preventDefault();
                      setAlvoRaiz(p.id || "raiz");
                    }}
                    onDragLeave={() => setAlvoRaiz(false)}
                    onDrop={(e) => {
                      setAlvoRaiz(false);
                      const id = e.dataTransfer.getData("text/obra-id");
                      if (id) { e.preventDefault(); onMoverObras([id], p.id); }
                    }}
                    title={
                      p.id
                        ? podeMover ? `Abrir "${p.nome}" · solte uma obra aqui para movê-la` : `Abrir "${p.nome}"`
                        : podeMover ? "Voltar · solte uma obra aqui para tirá-la da pasta" : "Voltar para Suas Obras"
                    }
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      border: alvo ? `1px dashed ${ORANGE}` : "1px solid transparent",
                      background: alvo ? T.primarySoft : "transparent",
                      color: T.muted, cursor: "pointer", padding: "3px 8px", borderRadius: 8,
                      fontFamily: FONT, fontSize: 13.5, maxWidth: 220,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {p.id ? <Folder size={14} /> : <Home size={14} />}
                    {p.nome}
                  </button>
                  <ChevronRight size={14} color={T.dim} />
                </React.Fragment>
              );
            })}
            <span style={{ color: T.text, fontWeight: 500 }}>{pastaAtual.nome}</span>
          </div>
        )}

        {/* Título, descrição e ações */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 600, color: T.text,
              margin: 0, letterSpacing: "-0.01em", lineHeight: 1.2,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              {pastaAtual ? (<><Folder size={24} color={ORANGE} />{pastaAtual.nome}</>) : "Suas Obras"}
            </h1>
            <p style={{ fontSize: 14, color: T.muted, margin: "4px 0 0" }}>
              {todasObras.length > 0
                ? pastaAtual
                  ? `${noNivel(obrasAtivas)} obras ativas · ${noNivel(obrasArquivadas)} arquivadas nesta pasta${subpastasNivel.length ? ` · ${subpastasNivel.length} ${subpastasNivel.length === 1 ? "subpasta" : "subpastas"}` : ""}`
                  : `${obrasAtivas.length} obras ativas · ${obrasArquivadas.length} arquivadas${listaPastas.length ? ` · ${listaPastas.length} ${listaPastas.length === 1 ? "pasta" : "pastas"}` : ""}`
                : "Nenhuma obra cadastrada ainda · comece criando sua primeira obra"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {podeMover && onCriarPasta && (
              <Btn
                T={T} variant="secondary" size="sm" onClick={() => setModalPasta("criar")}
                title={pastaAtual ? `Criar uma pasta dentro de "${pastaAtual.nome}"` : "Criar uma pasta"}
              >
                <FolderPlus size={15} />
                {pastaAtual ? "Nova subpasta" : "Nova pasta"}
              </Btn>
            )}
            {podeMover && pastaAtual && (
              <>
                {onRenomearPasta && (
                  <Btn T={T} variant="ghost" size="sm" onClick={() => setModalPasta("renomear")} title="Renomear pasta">
                    <Pencil size={14} />
                    Renomear
                  </Btn>
                )}
                {onExcluirPasta && (
                  <Btn T={T} variant="ghost" size="sm" onClick={excluirPastaAtual} title="Excluir pasta (as obras voltam para Suas Obras)" style={{ color: STATUS.error }}>
                    <Trash2 size={14} />
                    Excluir pasta
                  </Btn>
                )}
              </>
            )}

            {/* Abas segmentadas: Ativas / Arquivadas / Todas */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 2,
              background: T.hover, padding: 3, borderRadius: 12,
            }}>
              {[
                { id: "ativas", label: "Ativas", count: noNivel(obrasAtivas) },
                { id: "arquivadas", label: "Arquivadas", count: noNivel(obrasArquivadas), icon: Archive },
                { id: "todas", label: "Todas", count: noNivel(todasObras) },
              ].map((tab) => {
                const ativo = filtroAba === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFiltroAba(tab.id)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      height: 32, padding: "0 12px", borderRadius: 9,
                      fontSize: 13.5, fontWeight: ativo ? 600 : 500, fontFamily: FONT,
                      cursor: "pointer", border: "none",
                      background: ativo ? T.panel : "transparent",
                      boxShadow: ativo ? T.shadow : "none",
                      color: ativo ? T.text : T.muted,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {TabIcon && <TabIcon size={13} />}
                    <span>{tab.label}</span>
                    <span style={{
                      fontSize: 12, padding: "0 7px", borderRadius: 999,
                      background: ativo ? T.primarySoft : "transparent",
                      color: ativo ? ORANGE : T.muted,
                      fontWeight: 600, fontVariantNumeric: "tabular-nums",
                    }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pastas do nível atual (na raiz ou subpastas da pasta aberta) */}
        {mostrarPastas && (
          <section style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.muted, marginBottom: 10 }}>{pastaAtual ? "Subpastas" : "Pastas"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
              {subpastasNivel.map((p) => (
                <PastaCard
                  key={p.id}
                  pasta={p}
                  qtd={qtdPorPasta(p.id)}
                  qtdSub={subpastasDe(p.id).length}
                  T={T}
                  podeMover={podeMover}
                  onAbrir={() => setPastaAtualId(p.id)}
                  onSoltarObra={(obraId) => onMoverObras([obraId], p.id)}
                />
              ))}
            </div>
          </section>
        )}

        {mostrarPastas && (temObras || (podeCriar && filtroAba !== "arquivadas")) && (
          <div style={{ fontSize: 13, fontWeight: 500, color: T.muted, marginBottom: 10 }}>{pastaAtual ? "Obras nesta pasta" : "Obras sem pasta"}</div>
        )}

        {/* Grid de obras */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
          gap: 16,
        }}>
          {podeCriar && filtroAba !== "arquivadas" && <NovaObraCard onClick={onNovaObra} T={T} />}

          {obrasExibidas.map((obra) => (
            <ObraCard
              key={obra.id}
              obra={obra}
              isAtiva={obra.id === projAtualId}
              onClick={() => onSelecionarObra(obra.id)}
              onExcluir={() => onExcluirObra(obra.id)}
              onArquivar={onArquivarObra}
              T={T}
              podeExcluir={podeExcluir}
              podeMover={podeMover}
              pastas={pastasEmArvore}
              pastaAtualId={pastaDe(obra.id)}
              onMover={(pid) => onMoverObras([obra.id], pid)}
            />
          ))}
        </div>

        {/* Estado vazio */}
        {!temObras && !(mostrarPastas && filtroAba !== "arquivadas" && (pastaAtual || !podeCriar)) && (
          <div style={{
            marginTop: 24, padding: "22px 24px", borderRadius: RADIUS.card,
            background: T.panel, border: `1px solid ${T.lineSoft}`, boxShadow: T.shadow,
            display: "flex", alignItems: "center", gap: 18,
          }}>
            <SimboloUn height={36} style={{ opacity: 0.9 }} />
            <div>
              {filtroAba === "arquivadas" ? (
                <>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: T.text }}>
                    Nenhuma obra arquivada{pastaAtual ? " nesta pasta" : ""}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: T.muted }}>
                    Obras arquivadas por desenvolvedores (Dev) aparecem nesta aba para consulta ou reativação a qualquer momento.
                  </p>
                </>
              ) : pastaAtual ? (
                <>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: T.text }}>
                    Pasta vazia
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: T.muted }}>
                    {podeMover
                      ? <>Use <strong style={{ color: T.text }}>Mover</strong> no card de uma obra, ou arraste a obra até a pasta em Suas Obras.</>
                      : "Nenhuma obra foi colocada nesta pasta ainda."}
                  </p>
                </>
              ) : podeCriar ? (
                <>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: T.text }}>
                    {listaPastas.length ? "Todas as obras estão organizadas em pastas" : "Comece criando sua primeira obra"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: T.muted }}>
                    Clique em <strong style={{ color: ORANGE }}>+ Nova Obra</strong> para configurar um novo empreendimento com torres, pavimentos e atividades.
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: T.text }}>
                    Nenhuma obra disponível
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: T.muted }}>
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
        padding: "14px 24px",
        borderTop: `1px solid ${T.lineSoft}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 12.5, color: T.muted }}>
          Tempo × Caminho · Linha de Balanço · Unità Engenharia
        </span>
        <span style={{ fontSize: 12.5, color: T.dim }}>
          v1.0
        </span>
      </footer>

      {modalPasta && (
        <ModalPasta
          T={T}
          modo={modalPasta}
          nomeInicial={modalPasta === "renomear" ? pastaAtual?.nome || "" : ""}
          sugestoes={modalPasta === "criar" && !pastaAtual ? sugestoes : []}
          pastaMaeNome={modalPasta === "criar" ? pastaAtual?.nome || null : null}
          onFechar={() => setModalPasta(null)}
          onSalvar={async (nome, obraIds) => {
            if (modalPasta === "criar") {
              await onCriarPasta(nome, obraIds, pastaAtual?.id || null);
            } else if (pastaAtual) {
              await onRenomearPasta(pastaAtual.id, nome);
            }
            setModalPasta(null);
          }}
        />
      )}
    </div>
  );
}
