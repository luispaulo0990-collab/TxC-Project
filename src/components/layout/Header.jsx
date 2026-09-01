import React from "react";
import {
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FolderOpen,
  Save,
  Upload,
  Download,
  ChevronLeft,
  Share2,
  Check,
} from "lucide-react";
import { LogoUnita } from "../common/LogoUnita";
import { IconBtn } from "../common/IconBtn";
import { BLACK, ORANGE, NUM } from "../../constants/theme";

export const Header = ({
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
  onSalvar,
  onVoltarHome,
}) => {
  const [copiado, setCopiado] = React.useState(false);

  const handleCompartilhar = () => {
    if (!proj?.id) return;
    const url = `${window.location.origin}${window.location.pathname}?obra=${encodeURIComponent(proj.id)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  return (
    <header className="flex items-center gap-3 px-4 h-14 shrink-0 shadow-sm" style={{ background: BLACK, color: "#fff" }}>
      {/* Botão voltar para Home */}
      {onVoltarHome && (
        <button
          onClick={onVoltarHome}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.7)", border: "none", background: "transparent", cursor: "pointer", flexShrink: 0 }}
          title="Voltar para lista de obras"
        >
          <ChevronLeft size={15} />
          <span style={{ fontWeight: 500 }}>Obras</span>
        </button>
      )}

      <div className="flex items-center gap-3 pr-4" style={{ borderRight: "1px solid rgba(255,255,255,0.14)" }}>
        <LogoUnita ink="#fff" height={22} />
        <span className="text-xs tracking-widest font-medium" style={{ letterSpacing: 2, color: "rgba(255,255,255,0.72)" }}>
          TEMPO × CAMINHO
        </span>
      </div>

      <input
        value={proj.nome}
        onChange={(e) => setProj((p) => ({ ...p, nome: e.target.value }))}
        className="bg-transparent text-sm outline-none px-2 py-1 transition-colors hover:border-white/40 focus:border-white/70"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.18)", width: 160, fontWeight: 500, color: "#fff" }}
        title="Nome do Empreendimento"
      />

      {/* Alternância Gráfico / Resumo / Metas */}
      <div className="flex rounded overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.14)" }}>
        {[
          ["grafico", "Gráfico"],
          ["resumo", "Resumo"],
          ["metas", "Metas"],
          ["macrofluxo", "Macrofluxos"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setVista(k)}
            className="text-xs px-3 py-1.5 transition-colors"
            style={{
              background: vista === k ? ORANGE : "transparent",
              color: "#fff",
              fontWeight: vista === k ? 700 : 400,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {vista === "grafico" && (
        <select
          value={filtroTorre}
          onChange={(e) => setFiltroTorre(e.target.value)}
          className="text-xs px-2 py-1.5 outline-none rounded"
          style={{
            background: "rgba(255,255,255,0.07)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <option value="TODAS" style={{ color: "#000" }}>
            Todas as torres
          </option>
          {proj.torres.map((t) => (
            <option key={t.id} value={t.id} style={{ color: "#000" }}>
              {t.nome}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center ml-auto gap-1">
        <IconBtn onClick={() => setTema((t) => (t === "claro" ? "escuro" : "claro"))} title="Alternar tema">
          {tema === "claro" ? <Moon size={15} /> : <Sun size={15} />}
        </IconBtn>

        {vista === "grafico" && (
          <>
            <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.14)" }} />
            <IconBtn onClick={() => setPxPerDay((z) => Math.max(1.2, z / 1.3))} title="Reduzir zoom">
              <ZoomOut size={15} />
            </IconBtn>
            <span className="text-xs px-1 w-12 text-center select-none" style={{ ...NUM, color: "rgba(255,255,255,0.5)" }}>
              {Math.round(pxPerDay * 30)}%
            </span>
            <IconBtn onClick={() => setPxPerDay((z) => Math.min(14, z * 1.3))} title="Ampliar zoom">
              <ZoomIn size={15} />
            </IconBtn>
            <IconBtn onClick={() => setPxPerDay(3.4)} title="Ajustar zoom">
              <Maximize2 size={15} />
            </IconBtn>
          </>
        )}

        <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.14)" }} />
        <IconBtn onClick={() => onAbrirModal("abrir")} title="Abrir empreendimento">
          <FolderOpen size={15} />
        </IconBtn>
        <IconBtn onClick={() => onSalvar(proj)} title="Salvar empreendimento">
          <Save size={15} />
        </IconBtn>

        <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.14)" }} />
        
        {/* Botão Compartilhar Link */}
        <button
          onClick={handleCompartilhar}
          className="text-xs px-2.5 py-1.5 flex items-center gap-1.5 rounded transition-all hover:bg-white/15"
          style={{
            background: copiado ? "rgba(46, 125, 50, 0.4)" : "rgba(255,255,255,0.08)",
            border: `1px solid ${copiado ? "#4CAF50" : "rgba(255,255,255,0.18)"}`,
            color: copiado ? "#81C784" : "#fff",
            fontWeight: 500,
            cursor: "pointer",
          }}
          title="Copiar link direto para compartilhar esta obra"
        >
          {copiado ? <Check size={13} color="#81C784" /> : <Share2 size={13} />}
          <span>{copiado ? "Link Copiado!" : "Compartilhar"}</span>
        </button>

        <button
          onClick={() => onAbrirModal("importmenu")}
          className="text-xs px-2.5 py-1.5 flex items-center gap-1.5 rounded transition-colors hover:bg-white/10"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "#fff",
          }}
        >
          <Upload size={13} /> Importar
        </button>
        <button
          onClick={() => onAbrirModal("exportar")}
          className="text-xs px-2.5 py-1.5 flex items-center gap-1.5 rounded font-bold transition-all hover:brightness-110"
          style={{ background: ORANGE, color: "#fff" }}
        >
          <Download size={13} /> Exportar
        </button>
      </div>
    </header>
  );
};
