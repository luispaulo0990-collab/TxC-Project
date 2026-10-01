import { uid, iso, addDays, diffDays, D, parseData, ajustarFimDeSemanaParaSegunda } from "./dateUtils";
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
    const mapaIdGeradoPorPadrao = {};
    const novasDestaTorre = [];

    // Gerar atividades respeitando a ordem e predecessoras
    macro.atividadesPadrao.forEach((aPadrao) => {
      let dataIniAtiv = baseDate;

      if (aPadrao.predecessoraId && mapaDatasIni[aPadrao.predecessoraId]) {
        const predIni = mapaDatasIni[aPadrao.predecessoraId];
        const lag = Number(aPadrao.defasagemDias) || 0;
        dataIniAtiv = addDays(predIni, lag);
      }

      dataIniAtiv = ajustarFimDeSemanaParaSegunda(dataIniAtiv);
      mapaDatasIni[aPadrao.id] = dataIniAtiv;

      let duracaoDias = 20;
      if (aPadrao.modo === "LINHA") {
        const ritmo = Math.max(0.1, Number(aPadrao.ritmoMesPadrao) || 4);
        duracaoDias = Math.max(1, Math.round((nLoc * DIAS_MES) / ritmo));
      } else {
        duracaoDias = Math.max(1, Number(aPadrao.duracaoBloco) || 20);
      }

      const dataFimAtiv = ajustarFimDeSemanaParaSegunda(addDays(dataIniAtiv, duracaoDias));
      const novaId = uid();
      mapaIdGeradoPorPadrao[aPadrao.id] = novaId;

      const predAtivId = aPadrao.predecessoraId
        ? mapaIdGeradoPorPadrao[aPadrao.predecessoraId] || null
        : null;

      const novaAtividade = {
        id: novaId,
        torreId: targetTorre.id,
        nome: aPadrao.nome,
        cor: aPadrao.cor || BLACK,
        modo: aPadrao.modo || "LINHA",
        visivel: true,
        locIniId,
        locFimId,
        dataIni: iso(dataIniAtiv),
        dataFim: iso(dataFimAtiv),
        predecessoraId: predAtivId,
        defasagemDias: Number(aPadrao.defasagemDias) || 0,
        macroPadraoId: aPadrao.id,
        macrofluxoId: macro.id,
        realIni: null,
        realFim: null,
        avanco: 0,
        pavimentoAtualId: null,
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

/* ─── Auditoria de Incoerências de Predecessoras ─────────────── */
export function auditarIncoerenciasPredecessoras(proj) {
  if (!proj || !Array.isArray(proj.atividades)) return [];

  const out = [];
  const ativs = proj.atividades;

  ativs.forEach((a) => {
    if (!a.predecessoraId && !a.macroPadraoId) return;

    let pred = null;
    if (a.predecessoraId) {
      pred = ativs.find((x) => x.id === a.predecessoraId);
    }
    if (!pred && a.macrofluxoId && a.macroPadraoId && Array.isArray(proj.macrofluxos)) {
      const macro = proj.macrofluxos.find((m) => m.id === a.macrofluxoId);
      const aPadrao = macro?.atividadesPadrao?.find((ap) => ap.id === a.macroPadraoId);
      if (aPadrao?.predecessoraId) {
        pred = ativs.find((x) => x.torreId === a.torreId && x.macroPadraoId === aPadrao.predecessoraId);
      }
    }

    if (!pred) return;

    const dataIniA = D(a.dataIni);
    const dataIniPred = D(pred.dataIni);
    const defasagemConfigurada = Number(a.defasagemDias) || 0;

    // Incoerência 1: A atividade está planejada para iniciar antes de sua predecessora
    const inicioAntes = dataIniA < dataIniPred;
    
    // Incoerência 2: Defasagem inferior ao configurado no macrofluxo
    const defasagemReal = diffDays(dataIniPred, dataIniA);
    const defasagemViolada = defasagemConfigurada > 0 && defasagemReal < defasagemConfigurada;

    if (inicioAntes || defasagemViolada) {
      const diasAntecipados = inicioAntes ? diffDays(dataIniA, dataIniPred) : 0;
      const diasFaltantesDefasagem = defasagemViolada ? defasagemConfigurada - defasagemReal : 0;

      out.push({
        id: `${a.id}_vs_${pred.id}`,
        atividadeId: a.id,
        atividadeNome: a.nome,
        torreId: a.torreId,
        dataIni: a.dataIni,
        dataFim: a.dataFim,
        predecessoraId: pred.id,
        predecessoraNome: pred.nome,
        predecessoraDataIni: pred.dataIni,
        predecessoraDataFim: pred.dataFim,
        defasagemConfigurada,
        defasagemReal,
        inicioAntes,
        defasagemViolada,
        gravidade: inicioAntes ? "alta" : "media",
        diasAntecipados,
        diasFaltantesDefasagem,
        mensagem: inicioAntes
          ? `Iniciada ${diasAntecipados} ${diasAntecipados === 1 ? "dia" : "dias"} antes da sua predecessora "${pred.nome}".`
          : `Defasagem real (${defasagemReal}d) é inferior à mínima de ${defasagemConfigurada}d em relação a "${pred.nome}".`,
      });
    }
  });

  return out;
}

/* ─── Correção Automática de Incoerência no Cronograma ────────── */
export function corrigirIncoerenciaPredecessora(proj, atividadeId) {
  if (!proj || !Array.isArray(proj.atividades)) return proj;
  const a = proj.atividades.find((x) => x.id === atividadeId);
  if (!a) return proj;

  let pred = null;
  if (a.predecessoraId) {
    pred = proj.atividades.find((x) => x.id === a.predecessoraId);
  }
  if (!pred && a.macrofluxoId && a.macroPadraoId && Array.isArray(proj.macrofluxos)) {
    const macro = proj.macrofluxos.find((m) => m.id === a.macrofluxoId);
    const aPadrao = macro?.atividadesPadrao?.find((ap) => ap.id === a.macroPadraoId);
    if (aPadrao?.predecessoraId) {
      pred = proj.atividades.find((x) => x.torreId === a.torreId && x.macroPadraoId === aPadrao.predecessoraId);
    }
  }

  if (!pred) return proj;

  const duracao = Math.max(1, diffDays(D(a.dataIni), D(a.dataFim)));
  const lag = Number(a.defasagemDias) || 0;
  const novaDataIni = ajustarFimDeSemanaParaSegunda(addDays(D(pred.dataIni), lag));
  const novaDataFim = ajustarFimDeSemanaParaSegunda(addDays(novaDataIni, duracao));

  return {
    ...proj,
    atividades: proj.atividades.map((item) =>
      item.id === atividadeId
        ? {
            ...item,
            predecessoraId: pred.id,
            dataIni: iso(novaDataIni),
            dataFim: iso(novaDataFim),
          }
        : item
    ),
  };
}

