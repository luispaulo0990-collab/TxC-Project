import React from "react";
import { ArrowLeft, CalendarClock, Gauge, TrendingUp } from "lucide-react";
import { LogoUnita } from "../common/LogoUnita";
import { ORANGE, ERRO, OK, FONT, NUM, DIAS_MES } from "../../constants/theme";
import { D, diffDays, fmtBR, hoje } from "../../utils/dateUtils";

export const Resumo = ({ T, proj, metrica, pavimentoHoje, rowIdx, onVoltar, onSelect }) => {
  const ativs = proj.atividades.filter((a) => rowIdx[a.locIniId] != null && rowIdx[a.locFimId] != null);
  const datas = ativs.flatMap((a) => [D(a.dataIni), D(a.dataFim)]);
  const inicio = datas.length ? new Date(Math.min(...datas.map(Number))) : null;
  const termino = datas.length ? new Date(Math.max(...datas.map(Number))) : null;
  const durMeses = inicio && termino ? (diffDays(inicio, termino) / DIAS_MES).toFixed(1) : "—";
  const h = hoje();
  const emExec = ativs.filter((a) => {
    const s = pavimentoHoje(a);
    return s && s.estado === "em execução";
  });
  const concl = ativs.filter((a) => D(a.dataFim) <= h).length;
  const naoIni = ativs.filter((a) => D(a.dataIni) > h).length;
  const comReal = ativs.filter((a) => a.realIni).length;
  const velMedia = (() => {
    const ls = ativs.filter((a) => a.modo === "LINHA");
    if (!ls.length) return "—";
    return (ls.reduce((s, a) => s + metrica(a).ritmoMes, 0) / ls.length).toFixed(1);
  })();

  const Card = ({ icon: Ic, label, valor, sub, cor }) => (
    <div className="p-4 rounded-sm shadow-sm" style={{ background: T.panel, border: `1px solid ${T.line}` }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: T.muted }}>
        <Ic size={15} style={{ color: cor || ORANGE }} />
        <span style={{ fontSize: 10, letterSpacing: 1, fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ ...NUM, fontSize: 24, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>{valor}</div>
      {sub && <div style={{ ...NUM, fontSize: 11, color: T.dim, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: T.bg }}>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={onVoltar}
            className="p-1.5 rounded-sm transition-colors hover:brightness-95"
            style={{ color: T.muted, border: `1px solid ${T.line}`, background: T.panel }}
            title="Voltar ao gráfico"
          >
            <ArrowLeft size={15} />
          </button>
          <LogoUnita ink={T.logoInk} height={22} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>{proj.nome}</h1>
            <span style={{ fontSize: 11, color: T.muted }}>
              Resumo da obra · {proj.torres.length} torre{proj.torres.length > 1 ? "s" : ""} · {ativs.length} atividades
            </span>
          </div>
          <div className="ml-auto px-3 py-1.5 rounded-xs" style={{ background: ORANGE }}>
            <span style={{ fontSize: 10, letterSpacing: 1.5, color: "#fff", fontWeight: 700 }}>UNITÀ ENGENHARIA</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <Card icon={CalendarClock} label="Início da obra" valor={inicio ? fmtBR(inicio) : "—"} sub="primeira atividade" />
          <Card
            icon={CalendarClock}
            label="Término previsto"
            valor={termino ? fmtBR(termino) : "—"}
            sub={`${durMeses} meses de duração`}
            cor={ERRO}
          />
          <Card icon={Gauge} label="Velocidade média" valor={`${velMedia}`} sub="pav/mês (linhas)" />
          <Card
            icon={TrendingUp}
            label="Andamento"
            valor={`${concl}/${ativs.length}`}
            sub={`${emExec.length} em execução · ${naoIni} a iniciar`}
            cor={OK}
          />
        </div>

        {/* Situação e pavimento atual de cada atividade */}
        <div className="mt-6 rounded-sm shadow-sm" style={{ background: T.panel, border: `1px solid ${T.line}` }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.line}` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Situação por atividade</span>
            <span style={{ fontSize: 10.5, color: T.dim }}>referência: hoje, {fmtBR(h)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ ...NUM, fontSize: 11.5, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: T.dim, textAlign: "left" }}>
                  {["Atividade", "Torre", "Estado", "Pavimento atual", "Velocidade", "Início", "Término", "Realizado"].map(
                    (h2, i) => (
                      <th
                        key={i}
                        className="px-4 py-2"
                        style={{
                          fontSize: 9.5,
                          letterSpacing: 0.8,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          borderBottom: `1px solid ${T.line}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h2}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {ativs.map((a) => {
                  const m = metrica(a);
                  const s = pavimentoHoje(a);
                  const torre = proj.torres.find((t) => t.id === a.torreId);
                  const corEstado = s?.estado === "em execução" ? ORANGE : s?.estado === "concluída" ? OK : T.dim;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => onSelect(a.id)}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: `1px solid ${T.line}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = T.hover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-2" style={{ color: T.text, fontFamily: FONT }}>
                          <span style={{ width: 9, height: 9, background: a.cor, flexShrink: 0 }} />
                          {a.nome}
                        </span>
                      </td>
                      <td className="px-4 py-2" style={{ color: T.muted }}>
                        {torre?.nome || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span style={{ color: corEstado, fontWeight: 700, fontFamily: FONT, fontSize: 10.5 }}>
                          {s?.estado || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2" style={{ color: T.text }}>
                        {s?.loc || (s?.estado === "concluída" ? "— topo —" : "—")}
                      </td>
                      <td className="px-4 py-2" style={{ color: T.text }}>
                        {a.modo === "BLOCO" ? "bloco" : `${m.ritmoMes.toFixed(1)} pav/mês`}
                      </td>
                      <td className="px-4 py-2" style={{ color: T.muted }}>
                        {fmtBR(D(a.dataIni))}
                      </td>
                      <td className="px-4 py-2" style={{ color: T.muted }}>
                        {fmtBR(D(a.dataFim))}
                      </td>
                      <td className="px-4 py-2">
                        {a.realIni ? (
                          <span style={{ color: ERRO, fontWeight: 700, fontFamily: FONT, fontSize: 10.5 }}>
                            importado
                          </span>
                        ) : (
                          <span style={{ color: T.dim }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {comReal > 0 && (
            <div className="px-4 py-2.5" style={{ borderTop: `1px solid ${T.line}`, fontSize: 10.5, color: T.muted }}>
              <span style={{ color: ERRO, fontWeight: 700 }}>{comReal}</span> atividades com realizado importado
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
