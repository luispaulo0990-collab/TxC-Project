import { uid } from "../utils/dateUtils";
import { ORANGE, P447, BLACK } from "../constants/theme";
import { getModelosPadraoMacrofluxo } from "../utils/macrofluxoUtils";

/* ─── Projeto Semente (Artur Alvim) ─────────────────────────── */
export function seedProject() {
  const torreId = uid();
  const locais = [];
  const push = (nome, tipo, ordem) => locais.push({ id: uid(), torreId, nome, tipo, ordem });

  push("Fundação", "FUNDACAO", 0);
  push("Térreo", "TERREO", 1);
  for (let i = 1; i <= 25; i++) {
    push(`${i}º Pavimento${i === 25 ? "/Duplex" : ""}`, "TIPO", i + 1);
  }
  push("Cobertura/Casa de máquina", "COBERTURA", 27);
  push("Tampa cobertura", "TECNICO", 28);

  const byOrd = (o) => locais.find((l) => l.ordem === o)?.id;
  const A = (nome, cor, modo, oi, of_, di, df) => ({
    id: uid(),
    torreId,
    nome,
    cor,
    modo,
    visivel: true,
    locIniId: byOrd(oi),
    locFimId: byOrd(of_),
    dataIni: di,
    dataFim: df,
    realIni: null,
    realFim: null,
  });

  const atividades = [
    A("Impermeabilização + Proteção e CP", "#2E86AB", "BLOCO", 27, 28, "2026-07-01", "2026-08-14"),
    A("Telhado / Rufo", "#C9A227", "BLOCO", 27, 27, "2026-06-01", "2026-07-03"),
    A("Alvenaria + Acabamentos elevador", ORANGE, "BLOCO", 27, 28, "2026-08-17", "2026-10-02"),
    A("Skim Coat + Forro e Sanca", "#7D5BA6", "LINHA", 2, 26, "2026-04-06", "2026-07-24"),
    A("Piso Cerâmico + Azulejo", "#2E86AB", "LINHA", 2, 26, "2026-04-20", "2026-08-07"),
    A("Textura sacada", "#5C6F82", "LINHA", 1, 25, "2026-05-04", "2026-08-21"),
    A("Louças + Emassamento e 1ª Demão", "#1F4E79", "LINHA", 1, 25, "2026-05-18", "2026-09-04"),
    A("Bancadas + Ventokit", "#7FB069", "LINHA", 1, 25, "2026-06-01", "2026-09-18"),
    A("Cerâmica Hall + Rejunte", "#2E9E63", "LINHA", 1, 25, "2026-06-15", "2026-10-02"),
    A("Miolo de Tomada", "#B5446E", "LINHA", 1, 25, "2026-06-29", "2026-10-16"),
    A("Portas de madeira", "#4CA1A3", "LINHA", 1, 25, "2026-07-06", "2026-10-23"),
    A("Metais", "#D64545", "LINHA", 1, 25, "2026-07-20", "2026-11-06"),
    A("Disjuntor + Limpeza Grossa", BLACK, "LINHA", 0, 25, "2026-08-03", "2026-11-20"),
    A("Testes Elétricos", "#E0862A", "LINHA", 0, 25, "2026-06-08", "2026-09-25"),
    A("Stop Fire", "#D64545", "BLOCO", 2, 5, "2026-06-22", "2026-07-10"),
    A("Teste de Telefonia", "#4CA1A3", "BLOCO", 0, 4, "2026-07-13", "2026-08-28"),
  ];

  return {
    id: uid(),
    nome: "Artur Alvim",
    dataZero: "2026-04-01",
    torres: [{ id: torreId, nome: "Torre 1", offsetDias: 0, origem: null }],
    locais,
    atividades,
    macrofluxos: getModelosPadraoMacrofluxo(),
    marcos: [],
  };
}
