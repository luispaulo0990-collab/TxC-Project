import * as XLSX from "xlsx";
import { LABEL_W, TOWER_STRIP, HEADER_H, FONT, ORANGE, BLACK } from "../constants/theme";
import { D, diffDays, addDays, fmtBR } from "./dateUtils";


/* ─── Utilitários de Download e Exportação ───────────────────── */

export const baixar = (nome, conteudo, tipo, flash) => {
  try {
    const b = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = nome;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {}
      URL.revokeObjectURL(u);
    }, 1500);
    return true;
  } catch {
    try {
      const b = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
      const u = URL.createObjectURL(b);
      const w = window.open(u, "_blank");
      setTimeout(() => URL.revokeObjectURL(u), 4000);
      if (!w && flash) flash("Permita downloads/pop-ups para exportar");
      return !!w;
    } catch {
      if (flash) flash("Download bloqueado pelo navegador");
      return false;
    }
  }
};

export const buildSVG = ({ proj, rows, grupos, chartW, chartH, axisSvgContent, chartSvgContent, T }) => {
  const TOP = 46;
  const W = LABEL_W + chartW;
  const H = TOP + HEADER_H + chartH;

  let labels = "";
  grupos.forEach((g) => {
    const y = g.ini * 23;
    const h = (g.fim - g.ini + 1) * 23;
    labels += `<rect x="0" y="${y}" width="${TOWER_STRIP}" height="${h}" fill="${T.strip}"/>`;
    labels += `<text x="${TOWER_STRIP / 2}" y="${y + h / 2}" fill="${T.stripText}" font-family="${FONT}" font-size="11" font-weight="700" text-anchor="middle" transform="rotate(-90 ${TOWER_STRIP / 2} ${y + h / 2})">${g.nome}</text>`;
  });

  rows.forEach((r, i) => {
    const rowH = 23;
    labels += `<rect x="${TOWER_STRIP}" y="${i * rowH}" width="${LABEL_W - TOWER_STRIP}" height="${rowH}" fill="${r.tipo === "TIPO" ? T.labelBg : T.labelBgAlt}" stroke="${T.row}" stroke-width="0.5"/>`;
    labels += `<text x="${LABEL_W - 8}" y="${i * rowH + rowH / 2 + 3.5}" fill="${r.tipo === "TIPO" ? T.label : T.labelAlt}" font-family="${FONT}" font-size="9.5" text-anchor="end">${r.nome}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${T.surface}"/>
<rect width="${W}" height="${TOP}" fill="${BLACK}"/>
<text x="14" y="28" fill="#fff" font-family="${FONT}" font-size="15" font-weight="700" letter-spacing="1">UNITÀ · TEMPO × CAMINHO — ${(proj.nome || "OBRA").toUpperCase()}</text>
<rect x="${W - 56}" y="14" width="42" height="18" fill="${ORANGE}"/>
<text x="${W - 35}" y="27" fill="#fff" font-family="${FONT}" font-size="10" font-weight="700" text-anchor="middle">UNITÀ</text>
<g transform="translate(${LABEL_W},${TOP})">${axisSvgContent || ""}</g>
<g transform="translate(0,${TOP + HEADER_H})">${labels}</g>
<g transform="translate(${LABEL_W},${TOP + HEADER_H})">${chartSvgContent || ""}</g>
</svg>`;
};

export const exportarCSV = ({ proj, rows, rowIdx, metrica, nomeBase, flash }) => {
  const nome = (nomeBase || proj.nome || "tempo-x-caminho").replace(/[\/\\:*?"<>|]/g, "-");
  const linhas = ["empreendimento;torre;pavimento;atividade;modo;inicio_plan;fim_plan;ritmo_pav_mes"];
  
  proj.atividades.forEach((a) => {
    const t = proj.torres.find((x) => x.id === a.torreId);
    const i = rowIdx[a.locIniId];
    const f = rowIdx[a.locFimId];
    if (i == null || f == null) return;
    const m = metrica(a);
    const lo = Math.min(i, f);
    const hi = Math.max(i, f);
    const di = D(a.dataIni);
    const df = D(a.dataFim);
    const total = diffDays(di, df);

    for (let u = lo; u <= hi; u++) {
      let ii, ff;
      if (a.modo === "BLOCO" || hi === lo) {
        ii = di;
        ff = df;
      } else {
        const p = (u - i) / (f - i);
        const pn = (u + Math.sign(f - i) - i) / (f - i);
        ii = addDays(di, Math.round(p * total));
        ff = addDays(di, Math.round(Math.min(1, Math.max(0, pn)) * total));
        if (diffDays(ii, ff) <= 0) ff = addDays(ii, 1);
      }
      linhas.push(
        `${proj.nome};${t ? t.nome : ""};${rows[u]?.nome || ""};${a.nome};${a.modo};${fmtBR(ii)};${fmtBR(ff)};${a.modo === "BLOCO" ? "" : m.ritmoMes.toFixed(2)}`
      );
    }
  });

  baixar(`${nome}.csv`, "\uFEFF" + linhas.join("\n"), "text/csv;charset=utf-8", flash);
  if (flash) flash("CSV exportado");
};

export const exportarPNG = ({ svgString, surfaceColor, nomeBase, flash }) => {
  const nome = (nomeBase || "tempo-x-caminho").replace(/[\/\\:*?"<>|]/g, "-");
  const img = new Image();
  img.onload = () => {
    const s = 2;
    const cv = document.createElement("canvas");
    cv.width = img.width * s;
    cv.height = img.height * s;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = surfaceColor || "#FFFFFF";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.scale(s, s);
    ctx.drawImage(img, 0, 0);
    cv.toBlob(
      (b) => {
        if (b) {
          baixar(`${nome}.png`, b, "image/png", flash);
          if (flash) flash("PNG exportado");
        } else if (flash) {
          flash("Falha ao gerar PNG");
        }
      },
      "image/png"
    );
  };
  img.onerror = () => {
    if (flash) flash("Falha ao gerar PNG");
  };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
};

export const exportarJSON = ({ proj, nomeBase, flash }) => {
  const nome = (nomeBase || proj.nome || "tempo-x-caminho").replace(/[\/\\:*?"<>|]/g, "-");
  const jsonStr = JSON.stringify(proj, null, 2);
  baixar(`${nome}.json`, jsonStr, "application/json;charset=utf-8", flash);
  if (flash) flash("Projeto exportado em JSON");
};

/* ─── Exportar Planilha Excel / XML com Atividades, Pavimentos e Prazos ─── */
const gerarWorkbook = ({ proj, rows, rowIdx, metrica, pavimentoHoje }) => {
  // 1. Tabela Principal de Atividades com Pavimento Atual, Escopo e Período
  const dadosAtividades = proj.atividades.map((a) => {
    const t = proj.torres.find((x) => x.id === a.torreId);
    const locIni = proj.locais.find((l) => l.id === a.locIniId);
    const locFim = proj.locais.find((l) => l.id === a.locFimId);
    const m = metrica ? metrica(a) : { ritmoMes: 0, diasPorPav: 0, dias: 0, nLoc: 0 };
    const s = pavimentoHoje ? pavimentoHoje(a) : null;
    const pavAtual = s
      ? s.estado === "em execução"
        ? s.loc
        : s.estado === "concluída"
        ? "Concluída"
        : "A iniciar"
      : "—";

    return {
      "Atividade": a.nome,
      "Torre": t ? t.nome : "—",
      "Situação Atual": s ? s.estado : "—",
      "Pavimento Onde Está (Hoje)": pavAtual,
      "Pavimento Inicial": locIni ? locIni.nome : "—",
      "Pavimento Final": locFim ? locFim.nome : "—",
      "Qtd Pavimentos": m.nLoc,
      "Data Início (Planejado)": fmtBR(D(a.dataIni)),
      "Data Término (Planejado)": fmtBR(D(a.dataFim)),
      "Duração (dias)": m.dias,
      "Velocidade (pav/mês)": a.modo === "BLOCO" ? "Bloco" : Number(m.ritmoMes.toFixed(2)),
      "Dias por Pavimento": a.modo === "BLOCO" ? "—" : Number(m.diasPorPav.toFixed(1)),
      "Data Início (Realizado)": a.realIni ? fmtBR(D(a.realIni)) : "—",
      "Data Término (Realizado)": a.realFim ? fmtBR(D(a.realFim)) : "—",
      "Modo de Produção": a.modo,
    };
  });

  // 2. Cronograma Detalhado por Pavimento
  const dadosPorPavimento = [];
  if (rows && rowIdx) {
    proj.atividades.forEach((a) => {
      const t = proj.torres.find((x) => x.id === a.torreId);
      const i = rowIdx[a.locIniId];
      const f = rowIdx[a.locFimId];
      if (i == null || f == null) return;
      const m = metrica ? metrica(a) : { ritmoMes: 0 };
      const lo = Math.min(i, f);
      const hi = Math.max(i, f);
      const di = D(a.dataIni);
      const df = D(a.dataFim);
      const total = diffDays(di, df);

      for (let u = lo; u <= hi; u++) {
        let ii, ff;
        if (a.modo === "BLOCO" || hi === lo) {
          ii = di;
          ff = df;
        } else {
          const p = (u - i) / (f - i);
          const pn = (u + Math.sign(f - i) - i) / (f - i);
          ii = addDays(di, Math.round(p * total));
          ff = addDays(di, Math.round(Math.min(1, Math.max(0, pn)) * total));
          if (diffDays(ii, ff) <= 0) ff = addDays(ii, 1);
        }
        dadosPorPavimento.push({
          "Empreendimento": proj.nome,
          "Torre": t ? t.nome : "",
          "Pavimento": rows[u]?.nome || "",
          "Atividade": a.nome,
          "Data Início": fmtBR(ii),
          "Data Término": fmtBR(ff),
          "Velocidade (pav/mês)": a.modo === "BLOCO" ? "Bloco" : Number(m.ritmoMes.toFixed(2)),
          "Modo": a.modo,
        });
      }
    });
  }

  const wb = XLSX.utils.book_new();
  const wsAtivs = XLSX.utils.json_to_sheet(dadosAtividades);
  XLSX.utils.book_append_sheet(wb, wsAtivs, "Atividades e Pavimento");

  if (dadosPorPavimento.length > 0) {
    const wsPavs = XLSX.utils.json_to_sheet(dadosPorPavimento);
    XLSX.utils.book_append_sheet(wb, wsPavs, "Cronograma por Pavimento");
  }

  return wb;
};

export const exportarExcel = ({ proj, rows, rowIdx, metrica, pavimentoHoje, nomeBase, flash }) => {
  const nome = (nomeBase || proj.nome || "tempo-x-caminho").replace(/[\/\\:*?"<>|]/g, "-");
  try {
    const wb = gerarWorkbook({ proj, rows, rowIdx, metrica, pavimentoHoje });
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    baixar(
      `${nome}.xlsx`,
      wbout,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      flash
    );
    if (flash) flash("Planilha Excel (.xlsx) exportada");
  } catch (err) {
    console.error(err);
    if (flash) flash("Erro ao exportar planilha Excel");
  }
};

export const exportarXML = ({ proj, rows, rowIdx, metrica, pavimentoHoje, nomeBase, flash }) => {
  const nome = (nomeBase || proj.nome || "tempo-x-caminho").replace(/[\/\\:*?"<>|]/g, "-");
  try {
    const wb = gerarWorkbook({ proj, rows, rowIdx, metrica, pavimentoHoje });
    const wbout = XLSX.write(wb, { bookType: "xlml", type: "string" });
    baixar(`${nome}.xml`, wbout, "application/xml;charset=utf-8", flash);
    if (flash) flash("Planilha XML exportada");
  } catch (err) {
    console.error(err);
    if (flash) flash("Erro ao exportar planilha XML");
  }
};

/* ─── Exportar Modelo de Replanejamento ─────────────────────────
   Gera um .xlsx pré-preenchido com as atividades da torre ativa
   (ou todas) para o usuário editar as datas e reimportar.
──────────────────────────────────────────────────────────────── */
export const exportarModeloReplanejamento = ({ proj, torreId, flash }) => {
  try {
    const wb = XLSX.utils.book_new();

    /* ── Aba de Instruções ── */
    const instrucoes = [
      ["MODELO DE REPLANEJAMENTO — " + (proj.nome || "OBRA").toUpperCase()],
      [""],
      ["COMO USAR ESTE ARQUIVO:"],
      ["1. Não altere os nomes das colunas (linha 8 desta aba)."],
      ["2. Não altere a coluna 'Atividade' — ela é usada para identificar a atividade no app."],
      ["3. Edite apenas as colunas 'Inicio' e 'Fim' com as novas datas planejadas."],
      ["4. Use o formato DD/MM/AAAA para as datas (ex: 25/03/2026)."],
      ["5. Salve o arquivo e importe-o no app pelo menu Importar → Replanejamento."],
      [""],
      ["COLUNAS OBRIGATÓRIAS:"],
      ["  • Atividade  → nome exato da atividade (não altere)"],
      ["  • Inicio     → nova data de início planejada (DD/MM/AAAA)"],
      ["  • Fim        → nova data de término planejada (DD/MM/AAAA)"],
      [""],
      ["COLUNAS INFORMATIVAS (não afetam o import):"],
      ["  • Torre      → referência visual da torre"],
      ["  • Situação   → situação atual da atividade"],
      [""],
      ["ATENÇÃO: a data de Fim deve ser posterior à data de Inicio."],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrucoes);
    wsInstr["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, "Instruções");

    /* ── Aba de Replanejamento (dados) ── */
    // Filtra atividades pela torre (ou todas se torreId === "TODAS")
    const atividades = proj.atividades.filter(
      (a) => torreId === "TODAS" || a.torreId === torreId
    );

    // Cabeçalho
    const cabecalho = ["Atividade", "Inicio", "Fim", "Torre", "Situação"];

    const linhas = [cabecalho];
    atividades.forEach((a) => {
      const torre = proj.torres.find((t) => t.id === a.torreId);
      const di = D(a.dataIni);
      const df = D(a.dataFim);
      linhas.push([
        a.nome,
        fmtBR(di),
        fmtBR(df),
        torre ? torre.nome : "",
        a.realIni ? "com realizado" : "planejado",
      ]);
    });

    const wsReplan = XLSX.utils.aoa_to_sheet(linhas);

    // Larguras das colunas
    wsReplan["!cols"] = [
      { wch: 40 }, // Atividade
      { wch: 14 }, // Inicio
      { wch: 14 }, // Fim
      { wch: 18 }, // Torre
      { wch: 18 }, // Situação
    ];

    XLSX.utils.book_append_sheet(wb, wsReplan, "Replanejamento");

    const nomeArq = (proj.nome || "obra").replace(/[\/\\:*?"<>|]/g, "-");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    baixar(
      `modelo-replanejamento-${nomeArq}.xlsx`,
      wbout,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      flash
    );
    if (flash) flash("Modelo de replanejamento exportado");
  } catch (err) {
    console.error(err);
    if (flash) flash("Erro ao gerar modelo de replanejamento");
  }
};



