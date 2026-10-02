import * as XLSX from "xlsx";
import { D, iso, addDays, uid, parseData, fmtBR, hoje, ajustarFimDeSemanaParaSegunda } from "./dateUtils";
import { normalizar } from "./geometryUtils";
import { BLACK } from "../constants/theme";
import { baixar } from "./exportUtils";

/* Paleta de cores vibrantes e contrastantes para atividades importadas (sem preto) */
export const CORES_ALEATORIAS = [
  "#1F4E79", // Azul Profundo
  "#2E86AB", // Azul Médio
  "#0284C7", // Azul Céu
  "#0D9488", // Teal
  "#2E9E63", // Verde Esmeralda
  "#7FB069", // Verde Folha
  "#16A34A", // Verde Floresta
  "#C9A227", // Dourado
  "#D97706", // Âmbar
  "#FE5000", // Laranja TxC
  "#EA580C", // Laranja Queimado
  "#D64545", // Vermelho
  "#B5446E", // Framboesa
  "#DB2777", // Rosa Vivo
  "#7D5BA6", // Roxo Ametista
  "#6366F1", // Índigo
  "#8B5CF6", // Violeta
  "#4CA1A3", // Turquesa
  "#5C6F82", // Grafite Azulado
  "#E0862A", // Tangerina
];

let ultimaCorAleatoria = null;
export function gerarCorAleatoria() {
  const opcoes = CORES_ALEATORIAS.filter((c) => c !== ultimaCorAleatoria);
  const corEscolhida = opcoes[Math.floor(Math.random() * opcoes.length)] || CORES_ALEATORIAS[0];
  ultimaCorAleatoria = corEscolhida;
  return corEscolhida;
}

/**
 * Normaliza e identifica colunas de uma planilha
 */
export function mapearColunas(headerRow) {
  const cols = (headerRow || []).map((c) => normalizar(String(c || "")));
  
  const idxTorre = cols.findIndex((c) => c === "torre" || c.startsWith("torre") || c === "edificio" || c === "bloco");
  const idxAtiv = cols.findIndex((c) => 
    c === "atividade" || c.startsWith("atividade") || 
    c === "servico" || c === "serviço" || c.startsWith("servico") || 
    c === "nome" || c === "tarefa" || c === "descricao" || c === "item"
  );
  const idxIni = cols.findIndex((c) => 
    c === "inicio" || c.startsWith("inicio") || c.startsWith("data inicio") || 
    c.startsWith("inicio previsto") || c.startsWith("data ini") || c === "de_data"
  );
  const idxFim = cols.findIndex((c) => 
    c === "fim" || c.startsWith("fim") || c.startsWith("termino") || 
    c.startsWith("data fim") || c.startsWith("fim previsto") || c.startsWith("data termino") || c === "ate_data"
  );
  const idxLocIni = cols.findIndex((c) => 
    c.startsWith("pavimento inicial") || c.startsWith("locini") || c.startsWith("pav inicial") || 
    c.startsWith("de_pavimento") || c.startsWith("local inicial") || c === "pavimento de"
  );
  const idxLocFim = cols.findIndex((c) => 
    c.startsWith("pavimento final") || c.startsWith("locfim") || c.startsWith("pav final") || 
    c.startsWith("ate_pavimento") || c.startsWith("local final") || c === "pavimento ate"
  );
  const idxRealIni = cols.findIndex((c) => 
    c.startsWith("realizado inicio") || c.startsWith("inicio real") || c.startsWith("data real ini") || 
    c.startsWith("real ini") || c.startsWith("avanco inicio") || c.startsWith("data inicio real")
  );
  const idxRealFim = cols.findIndex((c) => 
    c.startsWith("realizado fim") || c.startsWith("fim real") || c.startsWith("data real fim") || 
    c.startsWith("real fim") || c.startsWith("termino real") || c.startsWith("avanco fim") || c.startsWith("data termino real")
  );
  const idxAvanco = cols.findIndex((c) => 
    c.startsWith("avanco") || c.startsWith("avanço") || c.startsWith("progresso") || 
    c.startsWith("% avanco") || c.startsWith("% concluido") || c.startsWith("percentual") || c === "%"
  );
  const idxPavAtual = cols.findIndex((c) => 
    c.startsWith("pavimento atual") || c.startsWith("pavimento realizado") || 
    c.startsWith("ultimo pavimento") || c.startsWith("pav atual") || c.startsWith("local atual")
  );
  const idxStatus = cols.findIndex((c) => c === "status" || c.startsWith("situacao") || c.startsWith("situaçao"));
  const idxModo = cols.findIndex((c) => c === "modo" || c.startsWith("modo"));
  const idxCor = cols.findIndex((c) => c === "cor" || c.startsWith("cor"));

  return {
    idxTorre,
    idxAtiv,
    idxIni,
    idxFim,
    idxLocIni,
    idxLocFim,
    idxRealIni,
    idxRealFim,
    idxAvanco,
    idxPavAtual,
    idxStatus,
    idxModo,
    idxCor,
    valido: idxAtiv >= 0,
  };
}

/**
 * Lê e processa arquivo de planilha (Excel ou CSV) para atividades e/ou avanços
 */
export async function processarArquivoImportacao({ file, tipo, proj, torreAtivaId }) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const linhas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

  if (!linhas || linhas.length === 0) {
    throw new Error("Arquivo vazio");
  }

  // 1. Localizar cabeçalho
  let hi = -1;
  let mapa = null;
  for (let i = 0; i < Math.min(linhas.length, 25); i++) {
    const m = mapearColunas(linhas[i] || []);
    if (m.valido) {
      hi = i;
      mapa = m;
      break;
    }
  }

  if (hi < 0 || !mapa) {
    throw new Error("Cabeçalho não encontrado. A planilha precisa ter ao menos a coluna 'Atividade' (ou 'Serviço').");
  }

  // Obter lista de torres e locais existentes
  const torres = proj.torres || [];
  const locais = proj.locais || [];
  const defaultTorre = torres.find((t) => t.id === torreAtivaId) || torres[0];

  if (!defaultTorre && tipo !== "replanejamento") {
    throw new Error("O empreendimento precisa de ao menos uma torre configurada.");
  }

  const registros = [];
  for (let i = hi + 1; i < linhas.length; i++) {
    const r = linhas[i] || [];
    const nome = String(r[mapa.idxAtiv] ?? "").trim();
    if (!nome) continue;

    const torreNome = mapa.idxTorre >= 0 ? String(r[mapa.idxTorre] ?? "").trim() : "";
    const diRaw = mapa.idxIni >= 0 ? parseData(r[mapa.idxIni]) : null;
    const dfRaw = mapa.idxFim >= 0 ? parseData(r[mapa.idxFim]) : null;
    const rIniRaw = mapa.idxRealIni >= 0 ? parseData(r[mapa.idxRealIni]) : null;
    const rFimRaw = mapa.idxRealFim >= 0 ? parseData(r[mapa.idxRealFim]) : null;

    // Se qualquer data cair em final de semana (sábado/domingo), joga para a próxima segunda-feira pós o fim de semana
    const di = diRaw ? ajustarFimDeSemanaParaSegunda(diRaw) : null;
    let df = dfRaw ? ajustarFimDeSemanaParaSegunda(dfRaw) : null;
    if (di && df && df <= di) {
      df = ajustarFimDeSemanaParaSegunda(addDays(di, 7));
    }
    const rIni = rIniRaw ? ajustarFimDeSemanaParaSegunda(rIniRaw) : null;
    const rFim = rFimRaw ? ajustarFimDeSemanaParaSegunda(rFimRaw) : null;
    
    // Processamento de % de Avanço
    let avancoVal = null;
    if (mapa.idxAvanco >= 0) {
      const rawAv = String(r[mapa.idxAvanco] ?? "").replace("%", "").replace(",", ".").trim();
      const numAv = parseFloat(rawAv);
      if (!isNaN(numAv)) {
        avancoVal = numAv <= 1 && numAv > 0 && String(r[mapa.idxAvanco]).includes(".") ? Math.round(numAv * 100) : Math.min(100, Math.max(0, Math.round(numAv)));
      }
    }

    const pavAtualNome = mapa.idxPavAtual >= 0 ? String(r[mapa.idxPavAtual] ?? "").trim() : "";
    const locIniNome = mapa.idxLocIni >= 0 ? String(r[mapa.idxLocIni] ?? "").trim() : "";
    const locFimNome = mapa.idxLocFim >= 0 ? String(r[mapa.idxLocFim] ?? "").trim() : "";
    const modoStr = mapa.idxModo >= 0 ? String(r[mapa.idxModo] ?? "").toUpperCase().trim() : "";
    const corStr = mapa.idxCor >= 0 ? String(r[mapa.idxCor] ?? "").trim() : "";
    const statusStr = mapa.idxStatus >= 0 ? String(r[mapa.idxStatus] ?? "").trim() : "";

    registros.push({
      linha: i + 1,
      nome,
      torreNome,
      di,
      df,
      rIni,
      rFim,
      avanco: avancoVal,
      pavAtualNome,
      locIniNome,
      locFimNome,
      modo: modoStr === "BLOCO" ? "BLOCO" : "LINHA",
      cor: corStr || "",
      status: statusStr,
    });
  }

  if (registros.length === 0) {
    throw new Error("Nenhum dado válido encontrado abaixo do cabeçalho.");
  }

  return { registros, mapa };
}

/**
 * Aplica os registros importados ao projeto
 */
export function aplicarImportacaoAoProjeto({ proj, registros, tipo, torreAtivaId }) {
  const tPadrao = proj.torres.find((t) => t.id === torreAtivaId) || proj.torres[0];
  let novasAtividades = [...proj.atividades];
  let novasTorres = [...proj.torres];
  let novosLocais = [...proj.locais];

  let criadas = 0;
  let atualizadas = 0;

  // 1. Tipo: "plan" ou "criar" ou "falta" -> Cria novas atividades
  if (tipo === "plan" || tipo === "falta" || tipo === "criar") {
    registros.forEach((r) => {
      // Determinar a torre alvo
      let targetTorre = tPadrao;
      if (r.torreNome) {
        const achouTorre = novasTorres.find(
          (t) => normalizar(t.nome) === normalizar(r.torreNome)
        );
        if (achouTorre) {
          targetTorre = achouTorre;
        } else {
          // Criar torre automaticamente se não existir
          const novaTorreId = uid();
          targetTorre = {
            id: novaTorreId,
            nome: r.torreNome,
            offsetDias: 0,
            origem: null,
          };
          novasTorres.push(targetTorre);
          // Criar pavimentos padrão para essa nova torre
          const padraoloc = [
            { id: uid(), torreId: novaTorreId, nome: "Fundação", tipo: "FUNDACAO", ordem: 0 },
            { id: uid(), torreId: novaTorreId, nome: "Térreo", tipo: "TERREO", ordem: 1 },
            { id: uid(), torreId: novaTorreId, nome: "1º Pavimento", tipo: "TIPO", ordem: 2 },
            { id: uid(), torreId: novaTorreId, nome: "2º Pavimento", tipo: "TIPO", ordem: 3 },
            { id: uid(), torreId: novaTorreId, nome: "Cobertura", tipo: "COBERTURA", ordem: 4 },
          ];
          novosLocais.push(...padraoloc);
        }
      }

      // Locais da torre alvo
      const ls = novosLocais
        .filter((l) => l.torreId === targetTorre.id)
        .sort((a, b) => a.ordem - b.ordem);

      if (!ls.length) return;

      // Determinar pavimento inicial e final
      let locIni = ls[0];
      let locFim = ls[ls.length - 1];

      if (r.locIniNome) {
        const lMatch = ls.find((l) => normalizar(l.nome) === normalizar(r.locIniNome));
        if (lMatch) locIni = lMatch;
      }
      if (r.locFimNome) {
        const lMatch = ls.find((l) => normalizar(l.nome) === normalizar(r.locFimNome));
        if (lMatch) locFim = lMatch;
      }

      const di = ajustarFimDeSemanaParaSegunda(r.di || D(proj.dataZero || new Date()));
      let df = r.df && r.df > di ? ajustarFimDeSemanaParaSegunda(r.df) : ajustarFimDeSemanaParaSegunda(addDays(di, 60));
      if (df <= di) {
        df = ajustarFimDeSemanaParaSegunda(addDays(di, 7));
      }

      const corEhPretoOuVazio =
        !r.cor ||
        r.cor === BLACK ||
        String(r.cor).toLowerCase() === "black" ||
        String(r.cor).toLowerCase() === "#000" ||
        String(r.cor).toLowerCase() === "#000000";
      const corFinal = !corEhPretoOuVazio ? r.cor : gerarCorAleatoria();

      const nova = {
        id: uid(),
        torreId: targetTorre.id,
        nome: r.nome,
        cor: corFinal,
        modo: r.modo || "LINHA",
        visivel: true,
        locIniId: locIni.id,
        locFimId: locFim.id,
        dataIni: iso(di),
        dataFim: iso(df),
        realIni: r.rIni ? iso(ajustarFimDeSemanaParaSegunda(r.rIni)) : null,
        realFim: r.rFim ? iso(ajustarFimDeSemanaParaSegunda(r.rFim)) : null,
        avanco: r.avanco != null ? r.avanco : 0,
        pavimentoAtualId: null,
      };

      if (r.pavAtualNome) {
        const pMatch = ls.find((l) => normalizar(l.nome) === normalizar(r.pavAtualNome));
        if (pMatch) nova.pavimentoAtualId = pMatch.id;
      }

      novasAtividades.push(nova);
      criadas++;
    });

    return {
      novoProj: {
        ...proj,
        torres: novasTorres,
        locais: novosLocais,
        atividades: novasAtividades,
      },
      resumo: `${criadas} atividade${criadas > 1 ? "s" : ""} criada${criadas > 1 ? "s" : ""} com sucesso`,
      criadas,
      atualizadas: 0,
    };
  }

  // 2. Tipo: "avanco" ou "real" -> Atualiza progresso e realizado das atividades existentes
  if (tipo === "avanco" || tipo === "real") {
    const mapaAtualizacoes = {};

    registros.forEach((r) => {
      // Encontrar atividade existente correspondente
      const match = novasAtividades.find((a) => {
        const mesmaAtiv = normalizar(a.nome) === normalizar(r.nome);
        if (!mesmaAtiv) return false;
        if (r.torreNome) {
          const t = proj.torres.find((x) => x.id === a.torreId);
          return t && normalizar(t.nome) === normalizar(r.torreNome);
        }
        return torreAtivaId === "TODAS" || a.torreId === torreAtivaId;
      });

      if (match) {
        const patch = {};
        if (r.rIni) patch.realIni = iso(r.rIni);
        if (r.rFim) patch.realFim = iso(r.rFim);
        if (r.avanco != null) patch.avanco = r.avanco;

        if (r.pavAtualNome) {
          const ls = proj.locais.filter((l) => l.torreId === match.torreId);
          const pMatch = ls.find((l) => normalizar(l.nome) === normalizar(r.pavAtualNome));
          if (pMatch) {
            patch.pavimentoAtualId = pMatch.id;
          }
        }

        // Se marcou 100% ou tem realFim, assegurar status
        if (r.avanco === 100 && !patch.realFim && r.df) {
          patch.realFim = iso(r.df);
        }

        mapaAtualizacoes[match.id] = patch;
        atualizadas++;
      }
    });

    novasAtividades = novasAtividades.map((a) =>
      mapaAtualizacoes[a.id] ? { ...a, ...mapaAtualizacoes[a.id] } : a
    );

    return {
      novoProj: {
        ...proj,
        atividades: novasAtividades,
      },
      resumo: atualizadas
        ? `Avanço atualizado em ${atualizadas} atividade${atualizadas > 1 ? "s" : ""}`
        : "Nenhuma atividade encontrada com os nomes da planilha",
      criadas: 0,
      atualizadas,
    };
  }

  // 3. Tipo: "replanejamento" -> Atualiza datas planejadas (dataIni e dataFim)
  if (tipo === "replanejamento") {
    const mapaReplan = {};
    registros.forEach((r) => {
      const match = novasAtividades.find((a) => {
        const mesmaAtiv = normalizar(a.nome) === normalizar(r.nome);
        if (!mesmaAtiv) return false;
        if (r.torreNome) {
          const t = proj.torres.find((x) => x.id === a.torreId);
          return t && normalizar(t.nome) === normalizar(r.torreNome);
        }
        return torreAtivaId === "TODAS" || a.torreId === torreAtivaId;
      });

      if (match && r.di && r.df) {
        const novaDi = ajustarFimDeSemanaParaSegunda(r.di);
        let novaDf = ajustarFimDeSemanaParaSegunda(r.df);
        if (novaDf <= novaDi) {
          novaDf = ajustarFimDeSemanaParaSegunda(addDays(novaDi, 7));
        }
        mapaReplan[match.id] = {
          dataIni: iso(novaDi),
          dataFim: iso(novaDf),
        };
        atualizadas++;
      }
    });

    novasAtividades = novasAtividades.map((a) =>
      mapaReplan[a.id] ? { ...a, ...mapaReplan[a.id] } : a
    );

    return {
      novoProj: {
        ...proj,
        atividades: novasAtividades,
      },
      resumo: atualizadas
        ? `Replanejamento aplicado a ${atualizadas} atividade${atualizadas > 1 ? "s" : ""}`
        : "Nenhuma atividade correspondente com datas válidas",
      criadas: 0,
      atualizadas,
    };
  }

  return { novoProj: proj, resumo: "Nenhuma alteração realizada", criadas: 0, atualizadas: 0 };
}

/**
 * Exporta Modelo Excel para Criação de Atividades
 */
export function exportarModeloAtividades({ proj, torreId, flash }) {
  try {
    const wb = XLSX.utils.book_new();
    const torres = Array.isArray(proj?.torres) ? proj.torres : [];
    const torre = torres.find((t) => t.id === torreId) || torres[0];
    const torreNome = torre?.nome || "Torre 1";

    const locais = Array.isArray(proj?.locais) ? proj.locais : [];
    const pavIniNome = locais.find((l) => l.tipo === "FUNDACAO" || l.tipo === "TERREO")?.nome || "Fundação";
    const pavFimNome = locais.length > 0 ? locais[locais.length - 1]?.nome || "Cobertura" : "Cobertura";

    const base = ajustarFimDeSemanaParaSegunda(hoje());
    const linhas = [
      ["Atividade", "Inicio", "Fim", "Torre", "Pavimento Inicial", "Pavimento Final", "Modo"],
      ["Estrutura de Concreto", fmtBR(base), fmtBR(ajustarFimDeSemanaParaSegunda(addDays(base, 80))), torreNome, pavIniNome, pavFimNome, "LINHA"],
      ["Alvenaria de Vedação", fmtBR(ajustarFimDeSemanaParaSegunda(addDays(base, 20))), fmtBR(ajustarFimDeSemanaParaSegunda(addDays(base, 100))), torreNome, "1º Pavimento", pavFimNome, "LINHA"],
      ["Instalações Elétricas / Hidráulicas", fmtBR(ajustarFimDeSemanaParaSegunda(addDays(base, 35))), fmtBR(ajustarFimDeSemanaParaSegunda(addDays(base, 115))), torreNome, "1º Pavimento", pavFimNome, "LINHA"],
      ["Revestimento Interno", fmtBR(ajustarFimDeSemanaParaSegunda(addDays(base, 50))), fmtBR(ajustarFimDeSemanaParaSegunda(addDays(base, 130))), torreNome, "1º Pavimento", pavFimNome, "LINHA"],
      ["Instalação de Esquadrias", fmtBR(ajustarFimDeSemanaParaSegunda(addDays(base, 70))), fmtBR(ajustarFimDeSemanaParaSegunda(addDays(base, 150))), torreNome, "1º Pavimento", pavFimNome, "LINHA"],
      ["Instalação de Elevadores", fmtBR(ajustarFimDeSemanaParaSegunda(addDays(base, 80))), fmtBR(ajustarFimDeSemanaParaSegunda(addDays(base, 140))), torreNome, pavIniNome, pavIniNome, "BLOCO"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(linhas);
    ws["!cols"] = [
      { wch: 35 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Modelo Atividades");

    try {
      XLSX.writeFile(wb, "modelo-criacao-atividades.xlsx");
    } catch {
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      baixar("modelo-criacao-atividades.xlsx", wbout, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", flash);
    }

    if (flash) flash("Modelo de atividades baixado com sucesso!");
  } catch (e) {
    console.error("Erro ao gerar modelo de atividades:", e);
    if (flash) flash("Erro ao gerar modelo de atividades: " + (e?.message || ""));
  }
}

/**
 * Exporta Modelo Excel para Apontamento de Avanço Físico
 */
export function exportarModeloAvanco({ proj, torreId, flash }) {
  try {
    const wb = XLSX.utils.book_new();
    const atividades = Array.isArray(proj?.atividades)
      ? proj.atividades.filter((a) => torreId === "TODAS" || a.torreId === torreId)
      : [];
    const torres = Array.isArray(proj?.torres) ? proj.torres : [];
    const locais = Array.isArray(proj?.locais) ? proj.locais : [];

    const linhas = [
      ["Atividade", "Torre", "% Avanço", "Pavimento Atual", "Data Real Inicio", "Data Real Fim", "Status"],
    ];

    if (atividades.length === 0) {
      linhas.push([
        "Estrutura de Concreto",
        torres[0]?.nome || "Torre 1",
        50,
        "5º Pavimento",
        fmtBR(hoje()),
        "",
        "Em Andamento",
      ]);
    } else {
      atividades.forEach((a) => {
        const t = torres.find((x) => x.id === a.torreId);
        const pavAtual = locais.find((l) => l.id === a.pavimentoAtualId);
        linhas.push([
          a.nome,
          t ? t.nome : "",
          a.avanco != null ? a.avanco : 0,
          pavAtual ? pavAtual.nome : "",
          a.realIni ? fmtBR(D(a.realIni)) : "",
          a.realFim ? fmtBR(D(a.realFim)) : "",
          a.avanco === 100 ? "Concluída" : a.avanco > 0 ? "Em Andamento" : "Não Iniciada",
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(linhas);
    ws["!cols"] = [
      { wch: 35 },
      { wch: 16 },
      { wch: 12 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Apontamento de Avanço");

    try {
      XLSX.writeFile(wb, "modelo-apontamento-avanco.xlsx");
    } catch {
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      baixar("modelo-apontamento-avanco.xlsx", wbout, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", flash);
    }

    if (flash) flash("Modelo de avanço baixado com sucesso!");
  } catch (e) {
    console.error("Erro ao gerar modelo de avanço:", e);
    if (flash) flash("Erro ao gerar modelo de avanço: " + (e?.message || ""));
  }
}
