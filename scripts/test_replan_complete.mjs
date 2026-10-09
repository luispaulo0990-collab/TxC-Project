import * as XLSX from "xlsx";
import { parseData, D, fmtBR, iso, addDays } from "../src/utils/dateUtils.js";
import { mapearColunas, encontrarMelhorPlanilha, aplicarImportacaoAoProjeto } from "../src/utils/importUtils.js";

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    throw new Error(message);
  }
  console.log("PASS:", message);
}

console.log("=== INICIANDO BATERIA DE TESTES DE REPLANEJAMENTO ===");

// Projeto simulado com 2 atividades
const projOriginal = {
  nome: "Edifício Horizonte",
  torres: [
    { id: "torre-1", nome: "Torre A" },
    { id: "torre-2", nome: "Torre B" }
  ],
  locais: [
    { id: "loc-1", torreId: "torre-1", nome: "Térreo", ordem: 1 },
    { id: "loc-2", torreId: "torre-1", nome: "1º Pavimento", ordem: 2 }
  ],
  atividades: [
    { id: "ativ-1", nome: "Estrutura de Concreto", torreId: "torre-1", dataIni: "2026-04-06", dataFim: "2026-06-01" },
    { id: "ativ-2", nome: "Alvenaria e Vedação", torreId: "torre-1", dataIni: "2026-05-04", dataFim: "2026-07-06" }
  ]
};

// -------------------------------------------------------------
// Teste 1: Simular a exportação exatamente como em exportUtils.js
// -------------------------------------------------------------
console.log("\n--- Teste 1: Validação do Workbook exportado ---");
const wbExport = XLSX.utils.book_new();

const cabecalho = ["Atividade", "Inicio", "Fim", "Torre", "Situação", "ID"];
const linhas = [cabecalho];
projOriginal.atividades.forEach((a) => {
  const torre = projOriginal.torres.find((t) => t.id === a.torreId);
  linhas.push([
    a.nome,
    fmtBR(D(a.dataIni)),
    fmtBR(D(a.dataFim)),
    torre ? torre.nome : "",
    "planejado",
    a.id
  ]);
});
const wsReplan = XLSX.utils.aoa_to_sheet(linhas);
XLSX.utils.book_append_sheet(wbExport, wsReplan, "Replanejamento");

const wsInstr = XLSX.utils.aoa_to_sheet([["INSTRUÇÕES"], ["Como usar este modelo..."]]);
XLSX.utils.book_append_sheet(wbExport, wsInstr, "Instruções");

const bufferOut = XLSX.write(wbExport, { type: "buffer", bookType: "xlsx" });

// Ler o arquivo binário gerado
const wbImport = XLSX.read(bufferOut, { type: "buffer", cellDates: true });
assert(wbImport.SheetNames[0] === "Replanejamento", "Primeira aba agora é 'Replanejamento'");
assert(wbImport.SheetNames[1] === "Instruções", "Segunda aba é 'Instruções'");

const matchAba1 = encontrarMelhorPlanilha(wbImport, "replanejamento");
assert(matchAba1 !== null, "Melhor planilha encontrada com sucesso");
assert(matchAba1.sheetName === "Replanejamento", "Aba identificada foi 'Replanejamento'");
assert(matchAba1.mapa.valido === true, "Cabeçalho é válido");
assert(matchAba1.mapa.idxAtiv === 0, "Coluna Atividade na pos 0");
assert(matchAba1.mapa.idxIni === 1, "Coluna Inicio na pos 1");
assert(matchAba1.mapa.idxFim === 2, "Coluna Fim na pos 2");
assert(matchAba1.mapa.idxId === 5, "Coluna ID na pos 5");

// -------------------------------------------------------------
// Teste 2: Se o arquivo tivesse 'Instruções' na frente (legado)
// -------------------------------------------------------------
console.log("\n--- Teste 2: Arquivo legado com 'Instruções' na frente ---");
const wbLegado = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbLegado, wsInstr, "Instruções");
XLSX.utils.book_append_sheet(wbLegado, wsReplan, "Replanejamento");

const matchAbaLegado = encontrarMelhorPlanilha(wbLegado, "replanejamento");
assert(matchAbaLegado !== null, "Encontrou a aba correta mesmo com 'Instruções' como Sheet 0");
assert(matchAbaLegado.sheetName === "Replanejamento", "Identificou 'Replanejamento' ignorando 'Instruções'");

// -------------------------------------------------------------
// Teste 3: Leitura e replanejamento com novas datas
// -------------------------------------------------------------
console.log("\n--- Teste 3: Replanejamento aplicado com sucesso ---");
// Simulando que o usuário editou a Estrutura para 13/04/2026 até 15/06/2026
// e a Alvenaria teve apenas a data final adiada para 20/07/2026
const wbEditado = XLSX.utils.book_new();
const linhasEditadas = [
  cabecalho,
  ["Estrutura de Concreto", "13/04/2026", "15/06/2026", "Torre A", "planejado", "ativ-1"],
  ["Alvenaria e Vedação", "", "20/07/2026", "Torre A", "planejado", "ativ-2"]
];
XLSX.utils.book_append_sheet(wbEditado, XLSX.utils.aoa_to_sheet(linhasEditadas), "Replanejamento");
const bufEditado = XLSX.write(wbEditado, { type: "buffer", cellDates: true });

const wbReadEditado = XLSX.read(bufEditado, { type: "buffer", cellDates: true });
const best = encontrarMelhorPlanilha(wbReadEditado, "replanejamento");
const rows = best.linhas;
const mapa = best.mapa;

const registros = [];
for (let i = best.headerIndex + 1; i < rows.length; i++) {
  const r = rows[i] || [];
  const nome = String(r[mapa.idxAtiv] ?? "").trim();
  if (!nome) continue;
  registros.push({
    linha: i + 1,
    id: mapa.idxId >= 0 ? String(r[mapa.idxId] ?? "").trim() : "",
    nome,
    torreNome: mapa.idxTorre >= 0 ? String(r[mapa.idxTorre] ?? "").trim() : "",
    di: mapa.idxIni >= 0 ? parseData(r[mapa.idxIni]) : null,
    df: mapa.idxFim >= 0 ? parseData(r[mapa.idxFim]) : null
  });
}

assert(registros.length === 2, "2 registros extraídos");
assert(iso(registros[0].di) === "2026-04-13", "Data inicial Estrutura: 2026-04-13");
assert(iso(registros[0].df) === "2026-06-15", "Data final Estrutura: 2026-06-15");
assert(registros[1].di === null, "Data inicial Alvenaria omitida (deve preservar original)");
assert(iso(registros[1].df) === "2026-07-20", "Data final Alvenaria: 2026-07-20");

const resReplan = aplicarImportacaoAoProjeto({
  proj: projOriginal,
  registros,
  tipo: "replanejamento",
  torreAtivaId: "torre-1"
});

assert(resReplan.atualizadas === 2, "2 atividades atualizadas no replanejamento");
const ativ1Nova = resReplan.novoProj.atividades.find(a => a.id === "ativ-1");
const ativ2Nova = resReplan.novoProj.atividades.find(a => a.id === "ativ-2");

assert(ativ1Nova.dataIni === "2026-04-13", "Ativ 1 dataIni atualizada para 2026-04-13");
assert(ativ1Nova.dataFim === "2026-06-15", "Ativ 1 dataFim atualizada para 2026-06-15");
assert(ativ2Nova.dataIni === "2026-05-04", "Ativ 2 preservou dataIni original 2026-05-04");
assert(ativ2Nova.dataFim === "2026-07-20", "Ativ 2 atualizou dataFim para 2026-07-20");

// -------------------------------------------------------------
// Teste 4: Planilha customizada com "Data Inicial" e "Data Final" sem coluna ID
// -------------------------------------------------------------
console.log("\n--- Teste 4: Planilha customizada sem ID ('Data Inicial' / 'Data Final') ---");
const wbCustom = XLSX.utils.book_new();
const linhasCustom = [
  ["Atividade", "Data Inicial", "Data Final", "Torre"],
  ["Estrutura de Concreto", "20/04/2026", "22/06/2026", "Torre A"]
];
XLSX.utils.book_append_sheet(wbCustom, XLSX.utils.aoa_to_sheet(linhasCustom), "Cronograma Obra");
const bufCustom = XLSX.write(wbCustom, { type: "buffer", bookType: "xlsx" });
const wbReadCustom = XLSX.read(bufCustom, { type: "buffer", cellDates: true });

const bestCustom = encontrarMelhorPlanilha(wbReadCustom, "replanejamento");
assert(bestCustom !== null, "Identificou planilha 'Cronograma Obra'");
assert(bestCustom.mapa.idxIni === 1, "Detectou 'Data Inicial'");
assert(bestCustom.mapa.idxFim === 2, "Detectou 'Data Final'");

const regCustom = [{
  linha: 2,
  id: "",
  nome: "Estrutura de Concreto",
  torreNome: "Torre A",
  di: parseData("20/04/2026"),
  df: parseData("22/06/2026")
}];

const resCustom = aplicarImportacaoAoProjeto({
  proj: projOriginal,
  registros: regCustom,
  tipo: "replanejamento",
  torreAtivaId: "torre-1"
});

assert(resCustom.atualizadas === 1, "Casou com sucesso por Nome e Torre");
const ativ1Custom = resCustom.novoProj.atividades.find(a => a.id === "ativ-1");
assert(ativ1Custom.dataIni === "2026-04-20", "Data inicial atualizada para 2026-04-20");
assert(ativ1Custom.dataFim === "2026-06-22", "Data final atualizada para 2026-06-22");

console.log("\n=============================================================");
console.log(" TODOS OS TESTES DE REPLANEJAMENTO PASSARAM COM SUCESSO!");
console.log("=============================================================");
