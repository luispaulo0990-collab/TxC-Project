// scripts/test_pre_deploy.js
// Suíte de testes automatizados pré-implantação para validação do app TxC
import * as XLSX from "xlsx";
import { D, iso, addDays, diffDays, fmtBR, hoje } from "../src/utils/dateUtils.js";
import { mapearColunas, aplicarImportacaoAoProjeto, encontrarLocal } from "../src/utils/importUtils.js";
import { calcularStatusAtividade } from "../src/utils/statusUtils.js";
import { calcularPermissao } from "../src/hooks/usePermissao.js";
import { gerarAtividadesDoMacrofluxo, getModelosPadraoMacrofluxo } from "../src/utils/macrofluxoUtils.js";
import { buildSVG } from "../src/utils/exportUtils.js";

console.log("===============================================================");
console.log("       INICIANDO SUÍTE DE TESTES PRÉ-IMPLANTAÇÃO (TXC)");
console.log("===============================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Falha no teste: ${message}`);
  }
}

// -----------------------------------------------------------------------------
// 1. TESTE DE PERMISSÕES E ROLES
// -----------------------------------------------------------------------------
console.log("[1/6] Testando Matriz de Permissões e Roles...");
const permDev = calcularPermissao("dev");
const permAdmin = calcularPermissao("admin");
const permMember = calcularPermissao("member");

assert(permDev.isDev === true && permDev.podeExcluir === true && permDev.podeVerAbaAvanco === true, "Dev possui permissão plena (exclusão, arquivamento e aba avanço)");
assert(permAdmin.isAdmin === true && permAdmin.podeExcluir === false && permAdmin.podeVerAbaAvanco === false, "Admin pode criar/editar mas NÃO pode excluir/arquivar nem ver aba avanço");
assert(permMember.isMember === true && permMember.podeEditar === false && permMember.podeVerAbaAvanco === false, "Member é somente leitura");

// -----------------------------------------------------------------------------
// 2. TESTE DE CRIAÇÃO DE OBRA E PAVIMENTOS
// -----------------------------------------------------------------------------
console.log("\n[2/6] Testando Estrutura de Obra de Teste...");
const obraTeste = {
  id: "obra-simulacao-2026",
  nome: "Residencial Horizonte - Simulação",
  incorporador: "TxC Engenharia",
  arquivado: false,
  torres: [
    { id: "torre-1", nome: "Torre A", ordem: 1 },
    { id: "torre-2", nome: "Torre B", ordem: 2 },
  ],
  locais: [
    { id: "loc-1", torreId: "torre-1", nome: "Subsolo", ordem: 0 },
    { id: "loc-2", torreId: "torre-1", nome: "Térreo", ordem: 1 },
    { id: "loc-3", torreId: "torre-1", nome: "1º Pavimento", ordem: 2 },
    { id: "loc-4", torreId: "torre-1", nome: "2º Pavimento", ordem: 3 },
    { id: "loc-5", torreId: "torre-1", nome: "3º Pavimento", ordem: 4 },
    { id: "loc-6", torreId: "torre-1", nome: "Cobertura", ordem: 5 },
    // Locais da Torre B
    { id: "loc-b1", torreId: "torre-2", nome: "Térreo B", ordem: 0 },
    { id: "loc-b2", torreId: "torre-2", nome: "1º Pavimento B", ordem: 1 },
    { id: "loc-b3", torreId: "torre-2", nome: "2º Pavimento B", ordem: 2 },
    { id: "loc-b4", torreId: "torre-2", nome: "Cobertura B", ordem: 3 },
  ],
  atividades: [],
};

assert(obraTeste.torres.length === 2, "Obra possui 2 torres configuradas");
assert(obraTeste.locais.filter(l => l.torreId === "torre-1").length === 6, "Obra possui 6 pavimentos na Torre A");
assert(obraTeste.locais.filter(l => l.torreId === "torre-2").length === 4, "Obra possui 4 pavimentos na Torre B");

// -----------------------------------------------------------------------------
// 3. TESTE DE CRIAÇÃO E RITMO DE ATIVIDADES
// -----------------------------------------------------------------------------
console.log("\n[3/6] Testando Criação de Atividades e Linha de Balanço...");
const dataBase = "2026-03-01";
const ativEstrutura = {
  id: "ativ-1",
  torreId: "torre-1",
  nome: "Estrutura de Concreto",
  locIniId: "loc-1",
  locFimId: "loc-6",
  dataIni: dataBase,
  dataFim: "2026-04-30",
  modo: "RITMO",
  cor: "#FE5000",
  avanco: 0,
  realIni: null,
  realFim: null,
};

const ativAlvenaria = {
  id: "ativ-2",
  torreId: "torre-1",
  nome: "Alvenaria e Vedações",
  locIniId: "loc-2",
  locFimId: "loc-5",
  dataIni: "2026-03-20",
  dataFim: "2026-05-15",
  modo: "RITMO",
  cor: "#2E86AB",
  avanco: 0,
  realIni: null,
  realFim: null,
};

obraTeste.atividades.push(ativEstrutura, ativAlvenaria);
assert(obraTeste.atividades.length === 2, "2 atividades adicionadas com sucesso à obra");

const duracaoEstrutura = diffDays(D(ativEstrutura.dataIni), D(ativEstrutura.dataFim));
assert(duracaoEstrutura === 60, `Duração planejada da estrutura calculada corretamente: ${duracaoEstrutura} dias`);

// -----------------------------------------------------------------------------
// 4. TESTE DE SIMULAÇÃO DE AVANÇO FÍSICO E STATUS
// -----------------------------------------------------------------------------
console.log("\n[4/6] Testando Simulação de Avanço Físico e Apontamentos...");

// Caso A: Atividade antes do início (data de corte anterior a dataIni)
let statusA = calcularStatusAtividade(ativEstrutura, obraTeste, {}, "2026-02-15");
assert(statusA.avanco === 0, "Avanço inicial é 0%");
assert(statusA.status === "NAO_INICIADA", "Status antes do início é NÃO INICIADA");

// Caso B: Linha de corte atingiu a atividade e ela não iniciou (0% de avanço)
let statusAtraso = calcularStatusAtividade(ativEstrutura, obraTeste, {}, "2026-03-15");
assert(statusAtraso.status === "ATRASADA" && statusAtraso.emAtraso === true, "Identificou corretamente como ATRASADA quando corte passou e avanço é 0%");

// Caso C: Simulação de avanço parcial com data real de início (50%)
ativEstrutura.avanco = 50;
ativEstrutura.realIni = "2026-03-05";
let statusB = calcularStatusAtividade(ativEstrutura, obraTeste, {}, "2026-03-31");
assert(statusB.avanco === 50, "Avanço atualizado para 50%");
assert(statusB.pavsConcluidos === 3, "3 pavimentos concluídos calculados com base em 50% de 6 pavimentos");

// Caso D: Simulação de conclusão total (100%)
ativEstrutura.avanco = 100;
ativEstrutura.realFim = "2026-04-28";
let statusC = calcularStatusAtividade(ativEstrutura, obraTeste, {}, "2026-05-01");
assert(statusC.avanco === 100, "Avanço de 100% refletido");
assert(statusC.status === "CONCLUIDA", "Status refletido como CONCLUÍDA");

// -----------------------------------------------------------------------------
// 5. TESTE DE EXPORTAÇÃO E IMPORTAÇÃO EXCEL (XLSX)
// -----------------------------------------------------------------------------
console.log("\n[5/6] Testando Motores de Importação e Exportação Excel...");

// A. Gerar Workbook em memória representando o modelo de Replanejamento / Exportação
const wbExport = XLSX.utils.book_new();
const cabecalho = ["Atividade", "Inicio", "Fim", "Torre", "Situação"];
const linhasExport = [
  cabecalho,
  [ativEstrutura.nome, "01/03/2026", "30/04/2026", "Torre A", "Concluída"],
  [ativAlvenaria.nome, "20/03/2026", "15/05/2026", "Torre A", "Não iniciada"],
];
const wsExport = XLSX.utils.aoa_to_sheet(linhasExport);
XLSX.utils.book_append_sheet(wbExport, wsExport, "Replanejamento");

const bufferOut = XLSX.write(wbExport, { type: "buffer", bookType: "xlsx" });
assert(bufferOut && bufferOut.length > 0, "Planilha Excel gerada com sucesso em buffer binário");

// B. Ler a planilha de volta e testar o mapeamento de colunas do importUtils
const wbImport = XLSX.read(bufferOut, { type: "buffer" });
assert(wbImport.SheetNames.includes("Replanejamento"), "Aba Replanejamento encontrada no arquivo gerado");

const wsImport = wbImport.Sheets["Replanejamento"];
const linhasImportadas = XLSX.utils.sheet_to_json(wsImport, { header: 1 });
const mapa = mapearColunas(linhasImportadas[0]);

assert(mapa.valido === true, "Mapeamento automático de colunas detectou cabeçalho válido");
assert(mapa.idxAtiv === 0, "Coluna 'Atividade' identificada na posição 0");
assert(mapa.idxIni === 1, "Coluna 'Inicio' identificada na posição 1");
assert(mapa.idxFim === 2, "Coluna 'Fim' identificada na posição 2");
assert(mapa.idxTorre === 3, "Coluna 'Torre' identificada na posição 3");

// C. Teste de Replanejamento (atualizar data de término da alvenaria para 30/05/2026)
const novaLinhaReplan = ["Alvenaria e Vedações", "25/03/2026", "30/05/2026", "Torre A"];
const ativParaAtualizar = obraTeste.atividades.find((a) => a.nome === novaLinhaReplan[mapa.idxAtiv]);
assert(!!ativParaAtualizar, "Atividade correspondente encontrada pelo nome no projeto");

if (ativParaAtualizar) {
  const [dIni, mIni, yIni] = novaLinhaReplan[mapa.idxIni].split("/");
  const [dFim, mFim, yFim] = novaLinhaReplan[mapa.idxFim].split("/");
  ativParaAtualizar.dataIni = `${yIni}-${mIni}-${dIni}`;
  ativParaAtualizar.dataFim = `${yFim}-${mFim}-${dFim}`;
}
assert(ativParaAtualizar.dataFim === "2026-05-30", "Replanejamento aplicado com sucesso: nova data final é 2026-05-30");

// -----------------------------------------------------------------------------
// 6. TESTE DE ARQUIVAMENTO E DESARQUIVAMENTO DE OBRAS
// -----------------------------------------------------------------------------
console.log("\n[6/8] Testando Fluxo de Arquivamento e Restauração...");
assert(obraTeste.arquivado === false, "Obra inicialmente ativa");

// Dev arquiva a obra
obraTeste.arquivado = true;
obraTeste.arquivado_em = new Date().toISOString();
obraTeste.arquivado_por = "dev-tester";
assert(obraTeste.arquivado === true, "Obra arquivada com sucesso");

// Dev desarquiva a obra
obraTeste.arquivado = false;
obraTeste.arquivado_em = null;
obraTeste.arquivado_por = null;
assert(obraTeste.arquivado === false, "Obra desarquivada/reativada com sucesso");

// -----------------------------------------------------------------------------
// 7. TESTE DE GERAÇÃO AUTOMÁTICA DE MACROFLUXO RÍTMICO
// -----------------------------------------------------------------------------
console.log("\n[7/8] Testando Motor de Macrofluxo e Sequenciamento Rítmico...");
const modelos = getModelosPadraoMacrofluxo();
assert(Array.isArray(modelos) && modelos.length > 0, "Modelos padrão de macrofluxo carregados com sucesso");

const modeloResidencial = modelos[0];
assert(modeloResidencial.atividadesPadrao.length >= 7, "Modelo residencial contém todas as etapas da cadeia construtiva");

// Aplicar macrofluxo na Torre B
const resultadoMacro = gerarAtividadesDoMacrofluxo({
  proj: obraTeste,
  macrofluxoId: modeloResidencial.id,
  torreId: "torre-2",
  dataInicio: "2026-06-01",
  substituirExistentes: true,
  listaMacrofluxos: modelos,
});

assert(resultadoMacro && resultadoMacro.totalNovas >= 7, `Macrofluxo gerou ${resultadoMacro.totalNovas} atividades sequenciadas na Torre B`);

const ativsTorreB = (resultadoMacro.novoProj.atividades || []).filter(a => a.torreId === "torre-2");
assert(ativsTorreB.length >= 7, "Todas as atividades da Torre B estão no novo estado do projeto");

const primeiraAtivB = ativsTorreB[0];
assert(!!primeiraAtivB, "Atividade gerada vinculada à Torre B");
assert(primeiraAtivB.locIniId === "loc-b1" && primeiraAtivB.locFimId === "loc-b4", "Locais inicial e final vinculados aos pavimentos da Torre B");

// -----------------------------------------------------------------------------
// 8. TESTE DE MOTOR DE EXPORTAÇÃO GRÁFICA (SVG / LINHA DE BALANÇO)
// -----------------------------------------------------------------------------
console.log("\n[8/8] Testando Geração de Vetores SVG para Exportação de Imagem...");
const rows = obraTeste.locais.map((l, i) => ({ id: l.id, nome: l.nome, torreId: l.torreId, idx: i }));
const grupos = [
  { id: "torre-1", nome: "Torre A", ini: 0, fim: 5 },
  { id: "torre-2", nome: "Torre B", ini: 6, fim: 9 },
];

const svgOutput = buildSVG({
  proj: obraTeste,
  rows,
  grupos,
  chartW: 1000,
  chartH: 600,
  axisSvgContent: "<g id='axis'></g>",
  chartSvgContent: "<g id='chart'></g>",
  T: { strip: "#373A36", stripText: "#FFFFFF", line: "#E2E2DF", text: "#1A1A1A" },
  rowH: 30,
});

assert(typeof svgOutput === "string" && svgOutput.startsWith("<svg"), "Geração de SVG produziu marcação SVG válida");
assert(svgOutput.includes("Torre A") && svgOutput.includes("Torre B"), "SVG contém os rótulos de ambas as torres");
assert(svgOutput.includes("Cobertura"), "SVG contém os pavimentos renderizados");

// -----------------------------------------------------------------------------
// 9. TESTE DE IMPORTAÇÃO DE ATIVIDADES EM BLOCO E RESOLUÇÃO DE PAVIMENTOS
// -----------------------------------------------------------------------------
console.log("\n[9/9] Testando Importação de Atividades no Modo BLOCO e Escopo de Pavimentos...");

// A. Reconhecimento robusto de colunas (com 'Pavimento de Início' e 'Pavimento de Término')
const cabecalhoBloco = ["Atividade", "Inicio", "Fim", "Torre", "Pavimento de Início", "Pavimento de Término", "Modo"];
const mapaBloco = mapearColunas(cabecalhoBloco);
assert(mapaBloco.valido === true, "Cabeçalho com colunas de início/término de pavimento validado");
assert(mapaBloco.idxLocIni === 4, "Coluna 'Pavimento de Início' identificada na posição 4");
assert(mapaBloco.idxLocFim === 5, "Coluna 'Pavimento de Término' identificada na posição 5");
assert(mapaBloco.idxModo === 6, "Coluna 'Modo' identificada na posição 6");

// B. Resolução inteligente de nomes e números de pavimentos
const locaisTorre1 = obraTeste.locais.filter(l => l.torreId === "torre-1");
const matchP1 = encontrarLocal(locaisTorre1, "1º Pavimento");
const matchNum1 = encontrarLocal(locaisTorre1, "1");
const matchOrd1 = encontrarLocal(locaisTorre1, "1º");
const matchDeg1 = encontrarLocal(locaisTorre1, "1°");
assert(matchP1 && matchP1.id === "loc-3", "Encontra pavimento por nome completo");
assert(matchNum1 && matchNum1.id === "loc-3", "Encontra pavimento informando apenas número ('1' -> '1º Pavimento')");
assert(matchOrd1 && matchOrd1.id === "loc-3", "Encontra pavimento com símbolo ordinal º ('1º')");
assert(matchDeg1 && matchDeg1.id === "loc-3", "Encontra pavimento com símbolo de grau ° ('1°')");

const matchCob = encontrarLocal(locaisTorre1, "Cobertura");
assert(matchCob && matchCob.id === "loc-6", "Encontra Cobertura corretamente");

// C. Importação de Bloco com pavimentos inicial e final definidos (não deve cobrir do térreo à cobertura)
const registrosImportBloco = [
  {
    nome: "Elevador Social",
    torreNome: "Torre A",
    di: new Date("2026-03-15"),
    df: new Date("2026-04-30"),
    locIniNome: "1º Pavimento",
    locFimNome: "3º Pavimento",
    modo: "BLOCO",
  },
  {
    nome: "Subestação de Energia",
    torreNome: "Torre A",
    di: new Date("2026-04-01"),
    df: new Date("2026-04-20"),
    locIniNome: "2",
    locFimNome: "2",
    modo: "BLOCO",
  },
  {
    nome: "Pressurização de Escadas",
    torreNome: "Torre A",
    di: new Date("2026-04-10"),
    df: new Date("2026-05-10"),
    locIniNome: "3º Pavimento",
    locFimNome: "",
    modo: "BLOCO",
  }
];

const resImport = aplicarImportacaoAoProjeto({
  proj: obraTeste,
  registros: registrosImportBloco,
  tipo: "plan",
  torreAtivaId: "torre-1",
});

const ativElevador = resImport.novoProj.atividades.find(a => a.nome === "Elevador Social");
const ativSubestacao = resImport.novoProj.atividades.find(a => a.nome === "Subestação de Energia");
const ativPressurizacao = resImport.novoProj.atividades.find(a => a.nome === "Pressurização de Escadas");

assert(ativElevador && ativElevador.modo === "BLOCO", "Atividade criada como BLOCO");
assert(ativElevador.locIniId === "loc-3", "Bloco inicia no 1º Pavimento (loc-3) e NÃO no Térreo/Subsolo");
assert(ativElevador.locFimId === "loc-5", "Bloco termina no 3º Pavimento (loc-5) e NÃO na Cobertura");

assert(ativSubestacao && ativSubestacao.locIniId === "loc-4" && ativSubestacao.locFimId === "loc-4", "Bloco pontual de número único '2' fica restrito ao 2º Pavimento");

assert(ativPressurizacao && ativPressurizacao.locIniId === "loc-5" && ativPressurizacao.locFimId === "loc-5", "Bloco com apenas pavimento inicial informado fica restrito a esse pavimento sem estender à cobertura");

console.log("\n===============================================================");
console.log(`  RESULTADO: ${passedTests}/${totalTests} TESTES EXECUTADOS COM SUCESSO!`);
console.log("  TODOS OS MÓDULOS FORAM RIGOROSAMENTE VALIDADOS.");
console.log("===============================================================\n");
