import { uid, iso, addDays, D, parseData } from "./dateUtils";
import { BLACK, ORANGE, DIAS_MES } from "../constants/theme";

/* ─── Modelos Padrão de Macrofluxo ──────────────────────────── */
export function getModelosPadraoMacrofluxo() {
  const m1Id = uid();
  const a1 = uid();
  const a2 = uid();
  const a3 = uid();
  const a4 = uid();
  const a5 = uid();
  const a6 = uid();
  const a7 = uid();
  const a8 = uid();

  return [
    {
      id: m1Id,
      nome: "Padrão Residencial Vertical (Completo)",
      descricao: "Sequência construtiva padrão de acabamentos e instalações para torres residenciais.",
      atividadesPadrao: [
        {
          id: a1,
          nome: "Estrutura / Alvenaria",
          cor: "#D64545",
          modo: "LINHA",
          ritmoMesPadrao: 4, // 4 pavimentos por mês
          duracaoBloco: 30,
          predecessoraId: null,
          defasagemDias: 0,
        },
        {
          id: a2,
          nome: "Instalações Hidráulicas e Elétricas",
          cor: "#E0862A",
          modo: "LINHA",
          ritmoMesPadrao: 4,
          duracaoBloco: 30,
          predecessoraId: a1,
          defasagemDias: 15,
        },
        {
          id: a3,
          nome: "Contrapiso e Impermeabilização",
          cor: "#2E86AB",
          modo: "LINHA",
          ritmoMesPadrao: 4,
          duracaoBloco: 30,
          predecessoraId: a2,
          defasagemDias: 14,
        },
        {
          id: a4,
          nome: "Gesso Liso e Drywall",
          cor: "#7D5BA6",
          modo: "LINHA",
          ritmoMesPadrao: 4,
          duracaoBloco: 30,
          predecessoraId: a3,
          defasagemDias: 14,
        },
        {
          id: a5,
          nome: "Revestimento Cerâmico e Azulejo",
          cor: "#2E9E63",
          modo: "LINHA",
          ritmoMesPadrao: 4,
          duracaoBloco: 30,
          predecessoraId: a4,
          defasagemDias: 14,
        },
        {
          id: a6,
          nome: "Louças, Metais e Bancadas",
          cor: "#7FB069",
          modo: "LINHA",
          ritmoMesPadrao: 4,
          duracaoBloco: 30,
          predecessoraId: a5,
          defasagemDias: 14,
        },
        {
          id: a7,
          nome: "Pintura e Esquadrias",
          cor: "#1F4E79",
          modo: "LINHA",
          ritmoMesPadrao: 4,
          duracaoBloco: 30,
          predecessoraId: a6,
          defasagemDias: 14,
        },
        {
          id: a8,
          nome: "Vistoria e Limpeza Final",
          cor: BLACK,
          modo: "LINHA",
          ritmoMesPadrao: 4,
          duracaoBloco: 30,
          predecessoraId: a7,
          defasagemDias: 10,
        },
      ],
    },
  ];
}

/* ─── Motor de Geração do Macrofluxo na Torre ────────────────── */
export function gerarAtividadesDoMacrofluxo({
  proj,
  macrofluxoId,
  torreId,
  dataInicio,
  substituirExistentes = true,
}) {
  if (!proj) throw new Error("Projeto não informado");
  
  const macro = (proj.macrofluxos || []).find((m) => m.id === macrofluxoId);
  if (!macro) throw new Error("Macrofluxo não encontrado");
  if (!macro.atividadesPadrao || macro.atividadesPadrao.length === 0) {
    throw new Error("O macrofluxo selecionado não possui atividades cadastradas");
  }

  const torresAlvo =
    torreId === "TODAS"
      ? proj.torres
      : proj.torres.filter((t) => t.id === torreId);

  if (!torresAlvo.length) {
    throw new Error("Nenhuma torre selecionada");
  }

  const baseDate = parseData(dataInicio) || D(dataInicio) || D(proj.dataZero);

  let atividadesAtualizadas = [...(proj.atividades || [])];
  let totalNovas = 0;

  torresAlvo.forEach((targetTorre) => {
    // Buscar locais da torre em ordem crescente
    const ls = (proj.locais || [])
      .filter((l) => l.torreId === targetTorre.id)
      .sort((a, b) => a.ordem - b.ordem);

    if (!ls.length) return;

    if (substituirExistentes) {
      atividadesAtualizadas = atividadesAtualizadas.filter(
        (a) => a.torreId !== targetTorre.id
      );
    }

    const nLoc = Math.max(1, ls.length);
    const locIniId = ls[0].id;
    const locFimId = ls[ls.length - 1].id;

    // Mapa para acompanhar a data de início calculada de cada atividade padrão
    const mapaDatasIni = {};
    const novasDestaTorre = [];

    // Gerar atividades respeitando a ordem e predecessoras
    macro.atividadesPadrao.forEach((aPadrao) => {
      let dataIniAtiv = baseDate;

      if (aPadrao.predecessoraId && mapaDatasIni[aPadrao.predecessoraId]) {
        const predIni = mapaDatasIni[aPadrao.predecessoraId];
        const lag = Number(aPadrao.defasagemDias) || 0;
        dataIniAtiv = addDays(predIni, lag);
      }

      mapaDatasIni[aPadrao.id] = dataIniAtiv;

      let duracaoDias = 30;
      if (aPadrao.modo === "LINHA") {
        const ritmo = Math.max(0.1, Number(aPadrao.ritmoMesPadrao) || 4);
        duracaoDias = Math.max(1, Math.round((nLoc * DIAS_MES) / ritmo));
      } else {
        duracaoDias = Math.max(1, Number(aPadrao.duracaoBloco) || 30);
      }

      const dataFimAtiv = addDays(dataIniAtiv, duracaoDias);

      const novaAtividade = {
        id: uid(),
        torreId: targetTorre.id,
        nome: aPadrao.nome,
        cor: aPadrao.cor || BLACK,
        modo: aPadrao.modo || "LINHA",
        visivel: true,
        locIniId,
        locFimId,
        dataIni: iso(dataIniAtiv),
        dataFim: iso(dataFimAtiv),
        realIni: null,
        realFim: null,
      };

      novasDestaTorre.push(novaAtividade);
      totalNovas++;
    });

    atividadesAtualizadas = [...atividadesAtualizadas, ...novasDestaTorre];
  });

  return {
    novoProj: {
      ...proj,
      atividades: atividadesAtualizadas,
    },
    totalNovas,
    nomeMacro: macro.nome,
  };
}
