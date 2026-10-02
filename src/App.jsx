import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

import { THEME, FONT, BLACK, DIAS_MES } from "./constants/theme";
import { D, iso, addDays, diffDays, uid, hoje, fmtBR, calcularDiasProdutivos, ajustarFimDeSemanaParaSegunda } from "./utils/dateUtils";
import { segIntersect } from "./utils/geometryUtils";
import { storage } from "./utils/storageUtils";
import { buildSVG, exportarPNG, exportarExcel, exportarModeloReplanejamento } from "./utils/exportUtils";
import { processarArquivoImportacao, aplicarImportacaoAoProjeto, exportarModeloAtividades, exportarModeloAvanco, gerarCorAleatoria } from "./utils/importUtils";

import { SidebarNav } from "./components/layout/SidebarNav";
import { Sidebar } from "./components/layout/Sidebar";
import { PropertiesPanel } from "./components/layout/PropertiesPanel";
import { StatusBar } from "./components/layout/StatusBar";
import { FlowlineChart } from "./components/chart/FlowlineChart";
import { Resumo } from "./components/views/Resumo";
import { MetasView } from "./components/views/MetasView";
import { MacrofluxoView } from "./components/views/MacrofluxoView";
import { AvancoView } from "./components/views/AvancoView";

import { ModalImportMenu } from "./components/modals/ModalImportMenu";
import { ModalImportar } from "./components/modals/ModalImportar";
import { ModalExport } from "./components/modals/ModalExport";
import { ModalGerar } from "./components/modals/ModalGerar";
import { ModalReplicar } from "./components/modals/ModalReplicar";
import { ModalAbrir } from "./components/modals/ModalAbrir";
import { ModalReplanejamento } from "./components/modals/ModalReplanejamento";
import { ModalNovaObra } from "./components/modals/ModalNovaObra";
import { ModalAplicarMacrofluxo } from "./components/modals/ModalAplicarMacrofluxo";
import { HomeScreen } from "./components/views/HomeScreen";
import { AuthScreen } from "./components/views/AuthScreen";
import { ModalGerenciarGrupo } from "./components/modals/ModalGerenciarGrupo";
import { gerarAtividadesDoMacrofluxo, auditarIncoerenciasPredecessoras } from "./utils/macrofluxoUtils";
import { apiClient } from "./utils/apiClient";
import { obterSessao, logout } from "./utils/supabaseClient";
import { usePermissao } from "./hooks/usePermissao";
import { ModalConfirmarExclusao } from "./components/modals/ModalConfirmarExclusao";
import { Loader2 } from "lucide-react";

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [gruposUsuario, setGruposUsuario] = useState([]);
  const [grupoAtivo, setGrupoAtivo] = useState(null);
  const [tela, setTela] = useState("home"); // "home" | "editor"
  const [proj, setProj] = useState(null);
  const [selId, setSelId] = useState(null);
  const [modalConfirmacao, setModalConfirmacao] = useState(null);
  const [pxPerDay, setPxPerDay] = useState(4.2);
  const [rowH, setRowH] = useState(30);
  const [snapWeek] = useState(false);
  const [tab, setTab] = useState("atividades");
  const [filtroTorre, setFiltroTorre] = useState("TODAS");
  const [salvos, setSalvos] = useState([]);
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [showProps, setShowProps] = useState(true);
  const [showActivities, setShowActivities] = useState(true);
  const [tema, setTema] = useState("claro");
  const [vista, setVista] = useState("grafico"); // grafico | avanco | resumo | metas | macrofluxo
  const [exibirRealizado, setExibirRealizado] = useState(true);
  const [exibirCruzamentos, setExibirCruzamentos] = useState(true);

  const T = THEME[tema];
  const chartRef = useRef(null);
  const axisRef = useRef(null);
  const fileRef = useRef(null);
  const importTipo = useRef("plan"); // plan | avanco | replanejamento
  const drag = useRef(null);
  const saveTimer = useRef(null);

  const flash = useCallback((m) => {
    setStatus(m);
    setTimeout(() => setStatus(""), 3000);
  }, []);

  /* ─── Persistência (Supabase Backend + Local Fallback + Auto Sync) ───────── */
  const listar = useCallback(async () => {
    try {
      let localIdx = [];
      try {
        const r = await storage.get("lob:index");
        localIdx = r ? JSON.parse(r.value) : [];
      } catch {}

      const serverProjetos = await apiClient.getProjetos();
      const serverLista = Array.isArray(serverProjetos)
        ? serverProjetos.map((item) => {
            const p = item.dados || item;
            return {
              id: item.id,
              nome: item.nome || p.nome || "Sem nome",
              incorporador: item.dados?.incorporador || p.incorporador || "",
              em: item.updated_at ? new Date(item.updated_at).getTime() : Date.now(),
              nTorres: p.torres?.length ?? 0,
              nAtividades: p.atividades?.length ?? 0,
              user_id: item.user_id ?? null,
              grupo_id: item.grupo_id ?? null,
            };
          })
        : [];

      const isUUID = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const serverIds = new Set(serverLista.map((x) => x.id));
      for (const locItem of localIdx) {
        if (!serverIds.has(locItem.id)) {
          try {
            const rp = await storage.get(`lob:proj:${locItem.id}`);
            if (rp) {
              let p = JSON.parse(rp.value);
              const oldId = p.id;
              if (!isUUID(p.id)) {
                const newId = uid();
                p = { ...p, id: newId };
                await storage.set(`lob:proj:${newId}`, JSON.stringify(p));
                await storage.remove(`lob:proj:${oldId}`);
              }
              p.user_id = user?.id || p.user_id || null;
              const saved = await apiClient.salvarProjeto(p, user?.id);
              if (saved) {
                serverLista.unshift({
                  id: p.id,
                  nome: p.nome || locItem.nome || "Sem nome",
                  em: locItem.em || Date.now(),
                  nTorres: p.torres?.length ?? 0,
                  nAtividades: p.atividades?.length ?? 0,
                  user_id: user?.id,
                  grupo_id: p.grupo_id || null,
                });
                serverIds.add(p.id);
              }
            }
          } catch (e) {
            console.warn("Erro ao enviar obra local para o Supabase:", e);
          }
        }
      }

      if (serverLista.length > 0) {
        setSalvos(serverLista);
        await storage.set(
          "lob:index",
          JSON.stringify(serverLista.map((x) => ({ id: x.id, nome: x.nome, em: x.em })))
        );
        for (const item of serverProjetos || []) {
          if (item.dados) {
            await storage.set(`lob:proj:${item.id}`, JSON.stringify(item.dados));
          }
        }
        return serverLista;
      }

      setSalvos([]);
      return [];
    } catch (err) {
      console.warn("Erro ao listar projetos:", err);
      setSalvos([]);
      return [];
    }
  }, [user]);

  useEffect(() => {
    async function initAuth() {
      try {
        const sessao = await obterSessao();
        if (sessao?.user) {
          setUser(sessao.user);
          if (sessao.access_token) {
            sessionStorage.setItem("lob:auth_token", sessao.access_token);
            sessionStorage.setItem("lob:user", JSON.stringify(sessao.user));
          }
        } else {
          const storedUser = sessionStorage.getItem("lob:user");
          const storedToken = sessionStorage.getItem("lob:auth_token");
          if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (e) {
        console.warn("Erro ao restaurar sessão:", e);
      } finally {
        setAuthLoading(false);
      }
    }
    initAuth();
  }, []);

  const carregarGrupos = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("lob:auth_token") || localStorage.getItem("lob:auth_token");
      if (!token) return;
      const res = await fetch("/api/grupos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGruposUsuario(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length === 1) {
          setGrupoAtivo(data[0].id);
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar grupos:", e);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    carregarGrupos();
    const params = new URLSearchParams(window.location.search);
    const obraId = params.get("obra") || params.get("p") || params.get("projeto");
    if (obraId) {
      abrir(obraId);
    } else {
      listar();
    }
  }, [user, listar, carregarGrupos]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setProj(null);
    setGruposUsuario([]);
    setGrupoAtivo(null);
    setTela("home");
    flash("Sessão encerrada com sucesso");
  };

  const salvar = useCallback(
    async (p, silencioso = false) => {
      if (!p) return;
      try {
        const projetoComUser = {
          ...p,
          user_id: p.user_id || user?.id || null,
        };

        const savedProject = await apiClient.salvarProjeto(projetoComUser, user?.id);
        if (!savedProject) {
          throw new Error("Não foi possível sincronizar a obra com o servidor");
        }

        await storage.set(`lob:proj:${p.id}`, JSON.stringify(projetoComUser));
        let idx = [];
        try {
          const r = await storage.get("lob:index");
          idx = r ? JSON.parse(r.value) : [];
        } catch {
          idx = [];
        }
        const novo = [{ id: p.id, nome: p.nome, em: Date.now() }, ...idx.filter((e) => e.id !== p.id)];
        await storage.set("lob:index", JSON.stringify(novo));
        setSalvos((prev) =>
          novo.map((item) => {
            const ex = prev.find((x) => x.id === item.id);
            return ex ? { ...item, nTorres: p.torres?.length ?? ex.nTorres, nAtividades: p.atividades?.length ?? ex.nAtividades } : { ...item, nTorres: p.torres?.length ?? 0, nAtividades: p.atividades?.length ?? 0 };
          })
        );

        if (!silencioso) flash("Empreendimento salvo no Supabase");
      } catch (err) {
        console.error("Erro ao salvar obra:", err);
        if (!silencioso) flash("Não foi possível salvar na nuvem");
      }
    },
    [flash, user]
  );

  useEffect(() => {
    if (!proj) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => salvar(proj, true), 1200);
    return () => clearTimeout(saveTimer.current);
  }, [proj, salvar]);

  const abrir = async (id) => {
    try {
      const serverProj = await apiClient.getProjeto(id);
      if (serverProj && serverProj.dados) {
        setProj(serverProj.dados);
        await storage.set(`lob:proj:${id}`, JSON.stringify(serverProj.dados));
        setSelId(null);
        setModal(null);
        setTela("editor");
        flash("Empreendimento carregado");
        return;
      }

      const r = await storage.get(`lob:proj:${id}`);
      if (r) {
        setProj(JSON.parse(r.value));
        setSelId(null);
        setModal(null);
        setTela("editor");
        flash("Empreendimento aberto");
      }
    } catch {
      flash("Empreendimento não encontrado");
    }
  };

  const selecionarObra = async (id) => {
    try {
      const serverProj = await apiClient.getProjeto(id);
      if (serverProj && serverProj.dados) {
        setProj(serverProj.dados);
        await storage.set(`lob:proj:${id}`, JSON.stringify(serverProj.dados));
        setSelId(null);
        setFiltroTorre("TODAS");
        setVista("grafico");
        setTela("editor");
        return;
      }

      const r = await storage.get(`lob:proj:${id}`);
      if (r) {
        setProj(JSON.parse(r.value));
        setSelId(null);
        setFiltroTorre("TODAS");
        setVista("grafico");
        setTela("editor");
      }
    } catch {
      flash("Não foi possível abrir a obra");
    }
  };

  const criarNovaObra = async (novoProjeto) => {
    const projetoComUser = {
      ...novoProjeto,
      user_id: user?.id || null,
    };
    setProj(projetoComUser);
    await salvar(projetoComUser, true);
    await listar();
    setSelId(null);
    setFiltroTorre("TODAS");
    setVista("grafico");
    setModal(null);
    setTela("editor");
    flash(`Obra "${novoProjeto.nome}" criada e salva!`);
  };

  const excluirObra = async (id) => {
    try {
      await storage.remove(`lob:proj:${id}`);
      const r = await storage.get("lob:index");
      const idx = r ? JSON.parse(r.value) : [];
      const novoIdx = idx.filter((e) => e.id !== id);
      await storage.set("lob:index", JSON.stringify(novoIdx));
      setSalvos((prev) => prev.filter((e) => e.id !== id));

      await apiClient.excluirProjeto(id);

      if (proj?.id === id) {
        setProj(null);
        setTela("home");
      }
      flash("Obra excluída com sucesso");
    } catch {
      flash("Não foi possível excluir");
    }
  };

  const pedirExcluirObra = (id) => {
    const obra = salvos.find((s) => s.id === id) || (proj?.id === id ? proj : null);
    setModalConfirmacao({
      titulo: "Excluir Obra",
      mensagem: "ATENÇÃO: Você está prestes a excluir permanentemente esta obra e todos os seus dados de linha de balanço, avanços e configurações no banco de dados. Esta ação não pode ser desfeita.",
      itemNome: obra?.nome || "Esta Obra",
      textoBotao: "Sim, Excluir Obra",
      onConfirmar: async () => {
        setModalConfirmacao(null);
        await excluirObra(id);
      },
    });
  };

  const voltarParaHome = async () => {
    if (proj) await salvar(proj, true);
    await listar();
    setTela("home");
  };

  /* ─── Eixo Y (Pavimentos e Torres) ──────────────────────────── */
  const rows = useMemo(() => {
    if (!proj) return [];
    const out = [];
    proj.torres.forEach((t) => {
      if (filtroTorre !== "TODAS" && filtroTorre !== t.id) return;
      if (collapsed[t.id]) return;
      proj.locais
        .filter((l) => l.torreId === t.id)
        .sort((a, b) => b.ordem - a.ordem)
        .forEach((l) => out.push({ ...l, torre: t }));
    });
    return out;
  }, [proj, filtroTorre, collapsed]);

  const rowIdx = useMemo(() => {
    const m = {};
    rows.forEach((r, i) => (m[r.id] = i));
    return m;
  }, [rows]);

  const grupos = useMemo(() => {
    const g = [];
    rows.forEach((r, i) => {
      const last = g[g.length - 1];
      if (last && last.torreId === r.torreId) last.fim = i;
      else g.push({ torreId: r.torreId, nome: r.torre.nome, ini: i, fim: i });
    });
    return g;
  }, [rows]);

  /* ─── Eixo X (Linha do Tempo) ───────────────────────────────── */
  const [t0, t1] = useMemo(() => {
    if (!proj) return [new Date(), new Date()];
    const ds = [];
    proj.atividades.forEach((a) => {
      ds.push(D(a.dataIni), D(a.dataFim));
      if (a.realIni) ds.push(D(a.realIni));
      if (a.realFim) ds.push(D(a.realFim));
    });
    proj.marcos.forEach((m) => ds.push(D(m.data)));
    if (!ds.length) {
      const z = D(proj.dataZero);
      return [z, addDays(z, 180)];
    }
    return [
      addDays(new Date(Math.min(...ds.map(Number))), -12),
      addDays(new Date(Math.max(...ds.map(Number))), 16),
    ];
  }, [proj]);

  const meses = useMemo(() => {
    const MESES_ABR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const out = [];
    let cur = new Date(t0.getFullYear(), t0.getMonth(), 1);
    let acumuladoDias = 0;

    while (cur <= t1) {
      const ano = cur.getFullYear();
      const mesIdx = cur.getMonth(); // 0 = jan, 11 = dez
      const isDezOuJan = mesIdx === 11 || mesIdx === 0;
      const numSemanas = isDezOuJan ? 2 : 4;
      const diasMes = numSemanas * 5; // Dezembro e Janeiro: exatamente 10 dias (2 semanas de 5 dias). Demais: 20 dias (4 semanas de 5 dias).

      const semanas = [];
      for (let s = 0; s < numSemanas; s++) {
        semanas.push({
          n: s + 1,
          diaOffset: s * 5,
          xDia: acumuladoDias + s * 5,
          dias: 5,
          d: new Date(ano, mesIdx, s * 5 + 1),
        });
      }

      const x0 = acumuladoDias * pxPerDay;
      const x1 = (acumuladoDias + diasMes) * pxPerDay;

      out.push({
        ano,
        mes: mesIdx,
        label: `${MESES_ABR[mesIdx]}/${String(ano).slice(2)}`,
        dias: diasMes,
        xDia: acumuladoDias,
        x0,
        x1,
        ini: new Date(ano, mesIdx, 1),
        fim: new Date(ano, mesIdx, diasMes),
        semanas,
      });

      acumuladoDias += diasMes;
      cur = new Date(ano, mesIdx + 1, 1);
    }
    return out;
  }, [t0, t1, pxPerDay]);

  const chartW = useMemo(() => {
    if (!meses.length) return 800;
    const ult = meses[meses.length - 1];
    return Math.max(800, Math.round(ult.x1));
  }, [meses]);

  const chartH = rows.length * rowH;

  const xOf = useCallback(
    (d) => {
      if (!d || !meses.length) return 0;
      const dateObj = typeof d === "string" ? D(d) : d;
      if (isNaN(dateObj.getTime())) return 0;
      const ano = dateObj.getFullYear();
      const mes = dateObj.getMonth();
      const dia = dateObj.getDate();

      const m = meses.find((item) => item.ano === ano && item.mes === mes);
      if (!m) {
        if (ano < meses[0].ano || (ano === meses[0].ano && mes < meses[0].mes)) {
          return 0;
        }
        return meses[meses.length - 1].x1;
      }

      const diaNoMes = Math.min(m.dias, Math.max(1, dia));
      const offsetDia = diaNoMes - 1;
      return Math.round((m.xDia + offsetDia) * pxPerDay);
    },
    [meses, pxPerDay]
  );

  const dateOfX = useCallback(
    (xPixels) => {
      if (!meses.length) return hoje();
      const diaTotal = Math.max(0, xPixels / Math.max(0.1, pxPerDay));
      const m = meses.find((item) => diaTotal >= item.xDia && diaTotal < item.xDia + item.dias) || meses[meses.length - 1];
      const offsetDia = Math.max(0, Math.min(m.dias - 1, Math.floor(diaTotal - m.xDia)));
      const targetDate = new Date(m.ano, m.mes, offsetDia + 1);
      return ajustarFimDeSemanaParaSegunda(targetDate);
    },
    [meses, pxPerDay]
  );

  const diffDaysPlanning = useCallback(
    (dataIni, dataFim) => {
      const x1 = xOf(dataIni);
      const x2 = xOf(dataFim);
      return Math.max(1, Math.round(Math.abs(x2 - x1) / Math.max(0.1, pxPerDay)));
    },
    [xOf, pxPerDay]
  );

  const yMid = useCallback((id) => (rowIdx[id] ?? 0) * rowH + rowH / 2, [rowIdx, rowH]);

  /* ─── Métricas de Produção (Considerando Calendário Nacional e Produtividade) ─── */
  const metrica = useCallback(
    (a) => {
      const i = rowIdx[a.locIniId],
        f = rowIdx[a.locFimId];
      const nLoc = i == null || f == null ? 0 : Math.abs(f - i) + 1;
      const diasTotais = diffDaysPlanning(D(a.dataIni), D(a.dataFim));
      const diasProdutivos = calcularDiasProdutivos(D(a.dataIni), D(a.dataFim));
      // Ritmo considerando DIAS_MES (20 dias úteis de trabalho por mês: 4 semanas de 5 dias)
      const ritmoMes = (nLoc / Math.max(1, diasProdutivos)) * DIAS_MES;
      return {
        nLoc,
        dias: diasTotais,
        diasProdutivos,
        ritmoMes,
        diasPorPav: diasProdutivos / Math.max(1, nLoc),
        meses: diasTotais / DIAS_MES,
      };
    },
    [rowIdx, diffDaysPlanning]
  );

  /* ─── Detecção de Cruzamentos / Conflitos ───────────────────── */
  const alertas = useMemo(() => {
    if (!proj) return [];
    const FMT_BR = (d) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const linhas = proj.atividades.filter(
      (a) => a.modo === "LINHA" && a.visivel !== false && rowIdx[a.locIniId] != null && rowIdx[a.locFimId] != null
    );
    const out = [];
    for (let i = 0; i < linhas.length; i++) {
      for (let j = i + 1; j < linhas.length; j++) {
        const a = linhas[i],
          b = linhas[j];
        if (a.torreId !== b.torreId) continue;
        const p = segIntersect(
          { x: xOf(D(a.dataIni)), y: rowIdx[a.locIniId] },
          { x: xOf(D(a.dataFim)), y: rowIdx[a.locFimId] },
          { x: xOf(D(b.dataIni)), y: rowIdx[b.locIniId] },
          { x: xOf(D(b.dataFim)), y: rowIdx[b.locFimId] }
        );
        if (p) {
          const r = rows[Math.round(p.y)];
          out.push({
            id: `${a.id}-${b.id}`,
            aId: a.id,
            bId: b.id,
            texto: `${a.nome} cruza ${b.nome}`,
            onde: r ? r.nome : "—",
            quando: FMT_BR(dateOfX(p.x)),
            x: p.x,
            y: p.y * rowH + rowH / 2,
          });
        }
      }
    }
    return out;
  }, [proj?.atividades, rowIdx, rows, xOf, dateOfX, rowH]);

  /* ─── Auditoria de Incoerências de Predecessoras (Macrofluxo) ─── */
  const incoerenciasPredecessoras = useMemo(() => {
    return auditarIncoerenciasPredecessoras(proj);
  }, [proj]);

  /* ─── Ações de Atividades ───────────────────────────────────── */
  const upA = (id, patch) =>
    setProj((p) => ({
      ...p,
      atividades: p.atividades.map((a) => {
        if (a.id !== id) return a;
        const updated = { ...a, ...patch };
        if (patch.dataIni) updated.dataIni = iso(ajustarFimDeSemanaParaSegunda(patch.dataIni));
        if (patch.dataFim) updated.dataFim = iso(ajustarFimDeSemanaParaSegunda(patch.dataFim));
        if (patch.realIni) updated.realIni = iso(ajustarFimDeSemanaParaSegunda(patch.realIni));
        if (patch.realFim) updated.realFim = iso(ajustarFimDeSemanaParaSegunda(patch.realFim));
        return updated;
      }),
    }));

  const sel = proj ? (proj.atividades.find((a) => a.id === selId) || null) : null;
  const torreAtiva = () => proj ? (proj.torres.find((x) => x.id === filtroTorre) || proj.torres[0]) : null;

  const novaAtividade = () => {
    const t = torreAtiva();
    const ls = proj.locais.filter((l) => l.torreId === t.id).sort((a, b) => a.ordem - b.ordem);
    if (!ls.length) return flash("Crie pavimentos antes de criar atividades");
    const base = ajustarFimDeSemanaParaSegunda(D(proj.dataZero || new Date()));
    const fim = ajustarFimDeSemanaParaSegunda(addDays(base, 80));
    const a = {
      id: uid(),
      torreId: t.id,
      nome: "Nova atividade",
      cor: gerarCorAleatoria(),
      modo: "LINHA",
      visivel: true,
      locIniId: ls[0].id,
      locFimId: ls[ls.length - 1].id,
      dataIni: iso(base),
      dataFim: iso(fim),
      realIni: null,
      realFim: null,
      avanco: 0,
      pavimentoAtualId: null,
    };
    setProj((p) => ({ ...p, atividades: [...p.atividades, a] }));
    setSelId(a.id);
    setShowProps(true);
    setTab("atividades");
    if (vista !== "grafico") setVista("grafico");
  };

  const duplicar = (a) => {
    const n = { ...a, id: uid(), nome: a.nome + " (cópia)" };
    setProj((p) => ({ ...p, atividades: [...p.atividades, n] }));
    setSelId(n.id);
  };

  const excluir = (id) => {
    setProj((p) => ({ ...p, atividades: p.atividades.filter((a) => a.id !== id) }));
    if (selId === id) setSelId(null);
  };

  const pedirExcluirAtividade = (id) => {
    const ativ = proj?.atividades?.find((a) => a.id === id);
    if (!ativ) return;
    setModalConfirmacao({
      titulo: "Excluir Atividade",
      mensagem: "Tem certeza que deseja excluir esta atividade da linha de balanço? Essa ação removerá seu planejamento e histórico de avanço associado.",
      itemNome: ativ.nome,
      textoBotao: "Excluir Atividade",
      onConfirmar: () => {
        setProj((p) => ({ ...p, atividades: p.atividades.filter((a) => a.id !== id) }));
        if (selId === id) setSelId(null);
        setModalConfirmacao(null);
        flash(`Atividade "${ativ.nome}" excluída.`);
      },
    });
  };

  /* ─── Importação de Planilha Excel / CSV ─────────────────────── */
  const abrirImport = (tipo) => {
    importTipo.current = tipo;
    if (tipo === "replanejamento") {
      setModal("replanejamento");
    } else {
      setModal("importar");
    }
  };

  const importarArquivo = async (file) => {
    if (!file) return;
    const t = torreAtiva();
    const tipo = importTipo.current;
    try {
      const { registros } = await processarArquivoImportacao({
        file,
        tipo,
        proj,
        torreAtivaId: t?.id,
      });

      const resultado = aplicarImportacaoAoProjeto({
        proj,
        registros,
        tipo,
        torreAtivaId: t?.id,
      });

      setProj(resultado.novoProj);
      setModal(null);
      flash(resultado.resumo);
    } catch (err) {
      setModal(null);
      flash(err.message || "Não foi possível ler o arquivo");
    }
  };

  const baixarModeloExcel = (tipoModelo) => {
    if (tipoModelo === "avanco") {
      exportarModeloAvanco({ proj, torreId: filtroTorre, flash });
    } else if (tipoModelo === "replanejamento") {
      exportarModeloReplanejamento({ proj, torreId: filtroTorre, flash });
    } else {
      exportarModeloAtividades({ proj, torreId: filtroTorre, flash });
    }
  };

  const [dragInfo, setDragInfo] = useState(null);

  /* ─── Ajustes Diretos de Velocidade e Inclinação ────────────── */
  const ajustarVelocidade = useCallback(
    (id, novaVelocidade) => {
      const a = proj ? proj.atividades.find((x) => x.id === id) : null;
      if (!a) return;
      const m = metrica(a);
      const nLoc = Math.max(1, m.nLoc);
      const vel = Math.max(0.05, Number(novaVelocidade) || 1);
      const dias = Math.max(1, Math.round((nLoc * DIAS_MES) / vel));
      const novaDataFim = iso(ajustarFimDeSemanaParaSegunda(addDays(D(a.dataIni), dias)));
      upA(id, { dataFim: novaDataFim });
    },
    [proj?.atividades, metrica, upA]
  );

  const ajustarDias = useCallback(
    (id, novosDias) => {
      const a = proj ? proj.atividades.find((x) => x.id === id) : null;
      if (!a) return;
      const d = Math.max(1, Number(novosDias) || 1);
      const novaDataFim = iso(ajustarFimDeSemanaParaSegunda(addDays(D(a.dataIni), d)));
      upA(id, { dataFim: novaDataFim });
    },
    [proj?.atividades, upA]
  );

  /* ─── Arraste Interativo no Gráfico ─────────────────────────── */
  const onDown = (e, a, modo) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setSelId(a.id);
    const m = metrica(a);
    drag.current = {
      id: a.id,
      modo,
      x0: e.clientX,
      y0: e.clientY,
      di: a.dataIni,
      df: a.dataFim,
      li: a.locIniId,
      lf: a.locFimId,
      nome: a.nome,
    };
    setDragInfo({
      active: true,
      id: a.id,
      modo,
      x: e.clientX,
      y: e.clientY,
      nome: a.nome,
      di: a.dataIni,
      df: a.dataFim,
      ritmoMes: m.ritmoMes,
      dias: m.dias,
      nLoc: m.nLoc,
    });
  };

  const onMove = (e) => {
    const g = drag.current;
    if (!g) return;
    const snap = snapWeek ? 7 : 1;
    const dd = Math.round((e.clientX - g.x0) / pxPerDay / snap) * snap;
    const dr = Math.round((e.clientY - g.y0) / rowH);

    let nextDi = g.di;
    let nextDf = g.df;
    let nextLi = g.li;
    let nextLf = g.lf;

    const alvo = (locId) => {
      const i = rowIdx[locId];
      if (i == null) return locId;
      const tw = rows[i].torreId;
      const k = Math.max(0, Math.min(rows.length - 1, i + dr));
      return rows[k].torreId === tw ? rows[k].id : locId;
    };

    if (g.modo === "move") {
      const curX0 = xOf(D(g.di));
      const curX1 = xOf(D(g.df));
      nextDi = iso(dateOfX(curX0 + dd * pxPerDay));
      nextDf = iso(dateOfX(curX1 + dd * pxPerDay));
      upA(g.id, {
        dataIni: nextDi,
        dataFim: nextDf,
      });
    } else if (g.modo === "ini") {
      const curX0 = xOf(D(g.di));
      const nd = dateOfX(curX0 + dd * pxPerDay);
      if (diffDaysPlanning(nd, D(g.df)) >= 1) {
        nextDi = iso(nd);
        nextLi = alvo(g.li);
        upA(g.id, { dataIni: nextDi, locIniId: nextLi });
      }
    } else if (g.modo === "fim" || g.modo === "tilt" || g.modo === "speed") {
      const curX1 = xOf(D(g.df));
      const nd = dateOfX(curX1 + dd * pxPerDay);
      if (diffDaysPlanning(D(g.di), nd) >= 1) {
        nextDf = iso(nd);
        if (g.modo === "fim") nextLf = alvo(g.lf);
        upA(g.id, { dataFim: nextDf, ...(g.modo === "fim" ? { locFimId: nextLf } : {}) });
      }
    }

    const dur = Math.max(1, diffDaysPlanning(D(nextDi), D(nextDf)));
    const iIdx = rowIdx[nextLi] ?? 0;
    const fIdx = rowIdx[nextLf] ?? 0;
    const nLoc = Math.abs(fIdx - iIdx) + 1;
    const ritmoMes = (nLoc / dur) * DIAS_MES;

    setDragInfo({
      active: true,
      id: g.id,
      modo: g.modo,
      x: e.clientX,
      y: e.clientY,
      nome: g.nome,
      di: nextDi,
      df: nextDf,
      ritmoMes,
      dias: dur,
      nLoc,
    });
  };

  const onUp = (e) => {
    if (drag.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
    drag.current = null;
    setDragInfo(null);
  };

  /* ─── Arraste da Barra Lateral para o Gráfico ─────────────── */
  const handleDropActivityFromSidebar = (actId, offsetX, offsetY) => {
    if (!proj || !proj.atividades) return;
    const a = proj.atividades.find((x) => x.id === actId);
    if (!a) return;
    const dIni = a.dataIni ? D(a.dataIni) : new Date();
    const dFim = a.dataFim ? D(a.dataFim) : addDays(dIni, 30);
    const duracaoDias = Math.max(1, diffDaysPlanning(dIni, dFim));
    const targetDate = dateOfX(offsetX);
    const targetDataFim = dateOfX(offsetX + duracaoDias * pxPerDay);

    const floorIdx = Math.max(0, Math.min(rows.length - 1, Math.floor(offsetY / rowH)));
    const droppedRow = rows[floorIdx];

    let patch = {
      dataIni: iso(targetDate),
      dataFim: iso(targetDataFim),
      visivel: true,
    };

    if (droppedRow && droppedRow.torreId === a.torreId) {
      const i = rowIdx[a.locIniId];
      const f = rowIdx[a.locFimId];
      if (i != null && f != null) {
        const span = f - i;
        const newIni = floorIdx;
        const newFim = Math.max(0, Math.min(rows.length - 1, newIni + span));
        if (rows[newIni]?.torreId === a.torreId && rows[newFim]?.torreId === a.torreId) {
          patch.locIniId = rows[newIni].id;
          patch.locFimId = rows[newFim].id;
        }
      }
    }

    upA(actId, patch);
    setSelId(actId);
    setShowProps(true);
    flash(`Atividade "${a.nome}" agendada para ${fmtBR(targetDate)}`);
  };

  /* ─── Exportação (Exclusivamente Excel e PNG) ───────────────── */
  const doExport = (formato, nomeBase) => {
    if (formato === "xlsx") {
      exportarExcel({ proj, rows, rowIdx, metrica, pavimentoHoje, nomeBase, flash });
      return;
    }

    if (formato === "png") {
      if (!chartRef.current) {
        flash("Abra a aba Gráfico para gerar a imagem em PNG");
        return;
      }
      const svgString = buildSVG({
        proj,
        rows,
        grupos,
        chartW,
        chartH,
        axisSvgContent: axisRef.current?.innerHTML,
        chartSvgContent: chartRef.current?.innerHTML,
        T,
      });
      exportarPNG({ svgString, surfaceColor: T.surface, nomeBase, flash });
    }
  };

  /* ─── Estrutura e Pavimentos ────────────────────────────────── */
  const gerarPavimentos = (torreId, { fundacao = true, subsolos = 0, tipo = 25, cobertura = true, tampa = true }) => {
    const ls = [];
    let o = 0;
    if (fundacao) ls.push({ id: uid(), torreId, nome: "Fundação", tipo: "FUNDACAO", ordem: o++ });
    for (let i = subsolos; i >= 1; i--) ls.push({ id: uid(), torreId, nome: `${i}º Subsolo`, tipo: "SUBSOLO", ordem: o++ });
    ls.push({ id: uid(), torreId, nome: "Térreo", tipo: "TERREO", ordem: o++ });
    for (let i = 1; i <= tipo; i++) ls.push({ id: uid(), torreId, nome: `${i}º Pavimento`, tipo: "TIPO", ordem: o++ });
    if (cobertura) ls.push({ id: uid(), torreId, nome: "Cobertura", tipo: "COBERTURA", ordem: o++ });
    if (tampa) ls.push({ id: uid(), torreId, nome: "Tampa cobertura", tipo: "TECNICO", ordem: o++ });

    setProj((p) => ({
      ...p,
      locais: [...p.locais.filter((l) => l.torreId !== torreId), ...ls],
      atividades: p.atividades.filter((a) => a.torreId !== torreId),
    }));
    setModal(null);
    flash(`${ls.length} pavimentos gerados`);
  };

  const replicarTorre = (origemId, offset) => {
    const orig = proj.torres.find((t) => t.id === origemId);
    const novaId = uid();
    const mapa = {};
    const nLocais = proj.locais
      .filter((l) => l.torreId === origemId)
      .map((l) => {
        const id = uid();
        mapa[l.id] = id;
        return { ...l, id, torreId: novaId };
      });
    const nAtivs = proj.atividades
      .filter((a) => a.torreId === origemId)
      .map((a) => ({
        ...a,
        id: uid(),
        torreId: novaId,
        locIniId: mapa[a.locIniId],
        locFimId: mapa[a.locFimId],
        dataIni: iso(addDays(D(a.dataIni), offset)),
        dataFim: iso(addDays(D(a.dataFim), offset)),
        realIni: null,
        realFim: null,
        avanco: 0,
        pavimentoAtualId: null,
      }));
    const nome = `Torre ${proj.torres.length + 1}`;
    setProj((p) => ({
      ...p,
      torres: [...p.torres, { id: novaId, nome, offsetDias: offset, origem: origemId }],
      locais: [...p.locais, ...nLocais],
      atividades: [...p.atividades, ...nAtivs],
    }));
    setModal(null);
    flash(`${nome} replicada de ${orig.nome} · defasagem ${offset} dias`);
  };

  const aplicarMacrofluxo = ({ macrofluxoId, torreId, dataInicio, substituirExistentes }) => {
    try {
      const res = gerarAtividadesDoMacrofluxo({
        proj,
        macrofluxoId,
        torreId,
        dataInicio,
        substituirExistentes,
      });
      setProj(res.novoProj);
      if (torreId !== "TODAS") {
        setFiltroTorre(torreId);
      }
      setVista("grafico");
      flash(`Macrofluxo "${res.nomeMacro}" aplicado com sucesso! (${res.totalNovas} atividades geradas)`);
    } catch (err) {
      flash(err.message || "Erro ao aplicar macrofluxo");
    }
  };

  const excluirTorre = (id) => {
    if (proj.torres.length <= 1) return flash("O empreendimento precisa de ao menos uma torre");
    setProj((p) => ({
      ...p,
      torres: p.torres.filter((t) => t.id !== id),
      locais: p.locais.filter((l) => l.torreId !== id),
      atividades: p.atividades.filter((a) => a.torreId !== id),
    }));
    if (filtroTorre === id) setFiltroTorre("TODAS");
  };

  const pedirExcluirTorre = (id) => {
    if (proj.torres.length <= 1) return flash("O empreendimento precisa de ao menos uma torre");
    const t = proj.torres.find((x) => x.id === id);
    setModalConfirmacao({
      titulo: "Excluir Torre",
      mensagem: "Tem certeza que deseja excluir esta torre? Todas as atividades e pavimentos associados a ela também serão removidos.",
      itemNome: t?.nome || "Torre",
      textoBotao: "Excluir Torre",
      onConfirmar: () => {
        setProj((p) => ({
          ...p,
          torres: p.torres.filter((x) => x.id !== id),
          locais: p.locais.filter((l) => l.torreId !== id),
          atividades: p.atividades.filter((a) => a.torreId !== id),
        }));
        if (filtroTorre === id) setFiltroTorre("TODAS");
        setModalConfirmacao(null);
        flash(`Torre "${t?.nome || ""}" excluída.`);
      },
    });
  };

  const addTorreVazia = () => {
    setProj((p) => ({
      ...p,
      torres: [...p.torres, { id: uid(), nome: `Torre ${p.torres.length + 1}`, offsetDias: 0, origem: null }],
    }));
  };

  const ativVisiveis = proj ? proj.atividades.filter(
    (a) => a.visivel !== false && rowIdx[a.locIniId] != null && rowIdx[a.locFimId] != null
  ) : [];

  const pavimentoHoje = useCallback(
    (a) => {
      const i = rowIdx[a.locIniId],
        f = rowIdx[a.locFimId];
      if (i == null || f == null) return null;
      const di = D(a.dataIni),
        df = D(a.dataFim),
        h = hoje();
      if (h <= di) return { estado: "não iniciada", loc: null };
      if (h >= df) return { estado: "concluída", loc: null };
      const p = diffDays(di, h) / Math.max(1, diffDays(di, df));
      const idxLoc = Math.round(i + p * (f - i));
      const r = rows[idxLoc];
      return { estado: "em execução", loc: r ? r.nome : null };
    },
    [rowIdx, rows]
  );

  /* ─── Renderização ──────────────────────────────────────────── */
  if (authLoading) {
    return (
      <div
        className="w-full h-screen flex flex-col items-center justify-center gap-3 select-none"
        style={{ background: T.bg, color: T.text, fontFamily: FONT }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: "#FE5000" }} />
        <span style={{ fontSize: 13, color: T.muted }}>Carregando autenticação...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        tema={tema}
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser);
          listar();
        }}
      />
    );
  }

  const grupoAtivoObj = gruposUsuario.find((g) => g.id === grupoAtivo);
  const userRoleNoGrupo = grupoAtivoObj?.meu_role
    ?? gruposUsuario[0]?.meu_role
    ?? "admin";

  if (tela === "home" || !proj) {
    return (
      <>
        <HomeScreen
          salvos={salvos}
          projAtualId={proj?.id}
          tema={tema}
          user={user}
          userRole={userRoleNoGrupo}
          grupos={gruposUsuario}
          grupoAtivo={grupoAtivo}
          onGrupoChange={setGrupoAtivo}
          onLogout={handleLogout}
          onSelecionarObra={selecionarObra}
          onNovaObra={() => setModal("novaObra")}
          onExcluirObra={pedirExcluirObra}
          onGerenciarGrupos={() => setModal("gerenciarGrupo")}
        />
        {modal === "novaObra" && (
          <ModalNovaObra
            T={T}
            tema={tema}
            onClose={() => setModal(null)}
            onCriar={criarNovaObra}
          />
        )}
        {modal === "gerenciarGrupo" && (
          <ModalGerenciarGrupo
            tema={tema}
            grupos={gruposUsuario}
            userRole={userRoleNoGrupo}
            userId={user?.id}
            onClose={() => setModal(null)}
            onRefresh={() => { carregarGrupos(); listar(); }}
          />
        )}
        {modalConfirmacao && (
          <ModalConfirmarExclusao
            T={T}
            titulo={modalConfirmacao.titulo}
            mensagem={modalConfirmacao.mensagem}
            itemNome={modalConfirmacao.itemNome}
            textoBotao={modalConfirmacao.textoBotao}
            onConfirmar={modalConfirmacao.onConfirmar}
            onCancelar={() => setModalConfirmacao(null)}
          />
        )}
      </>
    );
  }

  return (
    <div className="w-full h-screen flex flex-row overflow-hidden" style={{ background: T.bg, fontFamily: FONT, color: T.text }}>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          importarArquivo(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* ── Barra de Navegação Lateral (Sleek SidebarNav) ── */}
      <SidebarNav
        proj={proj}
        setProj={setProj}
        vista={vista}
        setVista={setVista}
        filtroTorre={filtroTorre}
        setFiltroTorre={setFiltroTorre}
        tema={tema}
        setTema={setTema}
        onAbrirModal={setModal}
        onSalvar={salvar}
        onVoltarHome={voltarParaHome}
        onLogout={handleLogout}
        user={user}
      />

      {/* ── Área de Conteúdo Central da Aplicação ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {vista === "avanco" ? (
          <AvancoView
            T={T}
            proj={proj}
            setProj={setProj}
            rows={rows}
            rowIdx={rowIdx}
            onVoltarGrafico={() => setVista("grafico")}
            onSelectAtividade={(id) => {
              setSelId(id);
              setVista("grafico");
              setShowProps(true);
            }}
            onAbrirImport={abrirImport}
            flash={flash}
          />
        ) : vista === "resumo" ? (
          <Resumo
            T={T}
            proj={proj}
            metrica={metrica}
            pavimentoHoje={pavimentoHoje}
            rowIdx={rowIdx}
            onVoltar={() => setVista("grafico")}
            onSelect={(id) => {
              setSelId(id);
              setVista("grafico");
              setShowProps(true);
            }}
          />
        ) : vista === "metas" ? (
          <MetasView
            T={T}
            proj={proj}
            rows={rows}
            rowIdx={rowIdx}
            onVoltar={() => setVista("grafico")}
            onSelectAtividade={(id) => {
              setSelId(id);
              setVista("grafico");
              setShowProps(true);
            }}
          />
        ) : vista === "macrofluxo" ? (
          <MacrofluxoView
            T={T}
            proj={proj}
            setProj={setProj}
            onVoltar={() => setVista("grafico")}
            onAplicarTorre={(macroId) =>
              setModal({
                tipo: "aplicarMacrofluxo",
                macroId,
                torreId: filtroTorre !== "TODAS" ? filtroTorre : proj.torres[0]?.id,
              })
            }
          />
        ) : (
          <div className="flex-1 flex min-h-0 relative">
            {/* Painel Esquerdo de Atividades e Estrutura */}
            <Sidebar
              T={T}
              tab={tab}
              setTab={setTab}
              proj={proj}
              setProj={setProj}
              filtroTorre={filtroTorre}
              selId={selId}
              setSelId={setSelId}
              setShowProps={setShowProps}
              metrica={metrica}
              alertas={alertas}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              showActivities={showActivities}
              setShowActivities={setShowActivities}
              upA={upA}
              onNovaAtividade={novaAtividade}
              onAbrirModal={setModal}
              onExcluirTorre={pedirExcluirTorre}
              onAddTorreVazia={addTorreVazia}
            />

            {/* Gráfico Central de Linha de Balanço */}
            <div className="flex-1 flex flex-col min-w-0">
              <FlowlineChart
                T={T}
                proj={proj}
                rows={rows}
                rowIdx={rowIdx}
                grupos={grupos}
                meses={meses}
                chartW={chartW}
                chartH={chartH}
                rowH={rowH}
                setRowH={setRowH}
                pxPerDay={pxPerDay}
                setPxPerDay={setPxPerDay}
                xOf={xOf}
                yMid={yMid}
                ativVisiveis={ativVisiveis}
                alertas={alertas}
                incoerencias={incoerenciasPredecessoras}
                exibirRealizado={exibirRealizado}
                setExibirRealizado={setExibirRealizado}
                exibirCruzamentos={exibirCruzamentos}
                setExibirCruzamentos={setExibirCruzamentos}
                showActivities={showActivities}
                setShowActivities={setShowActivities}
                onSalvar={salvar}
                onAbrirModal={setModal}
                selId={selId}
                setSelId={(id) => {
                  setSelId(id);
                  if (id) setShowProps(true);
                }}
                dragInfo={dragInfo}
                axisRef={axisRef}
                chartRef={chartRef}
                onDown={onDown}
                onMove={onMove}
                onUp={onUp}
                onDropActivity={handleDropActivityFromSidebar}
              />

              {/* Barra de Status e Alertas */}
              <StatusBar
                T={T}
                alertas={alertas}
                status={status}
                exibirCruzamentos={exibirCruzamentos}
                setExibirCruzamentos={setExibirCruzamentos}
                onSelectConflito={(aId) => {
                  setSelId(aId);
                  setShowProps(true);
                }}
              />
            </div>

            {/* Painel Direito de Propriedades e Avanço da Atividade */}
            <PropertiesPanel
              T={T}
              showProps={showProps}
              setShowProps={setShowProps}
              sel={sel}
              proj={proj}
              upA={upA}
              metrica={metrica}
              alertas={alertas}
              ajustarVelocidade={ajustarVelocidade}
              ajustarDias={ajustarDias}
              onDuplicar={duplicar}
              onExcluir={pedirExcluirAtividade}
              user={user}
            />
          </div>
        )}
      </div>

      {/* ── Modais ── */}
      {modal === "importmenu" && (
        <ModalImportMenu
          T={T}
          torreNome={torreAtiva()?.nome}
          onClose={() => setModal(null)}
          onSelectTipo={abrirImport}
          onBaixarModelo={baixarModeloExcel}
        />
      )}

      {modal === "importar" && (
        <ModalImportar
          T={T}
          tipo={importTipo.current}
          onClose={() => setModal(null)}
          onPickFile={() => fileRef.current?.click()}
          onBaixarModelo={baixarModeloExcel}
        />
      )}

      {modal === "exportar" && (
        <ModalExport
          T={T}
          nomePadrao={proj.nome}
          onClose={() => setModal(null)}
          onOk={doExport}
        />
      )}

      {modal === "abrir" && (
        <ModalAbrir
          T={T}
          projId={proj.id}
          salvos={salvos}
          onClose={() => setModal(null)}
          onAbrir={abrir}
        />
      )}

      {modal === "replicar" && (
        <ModalReplicar
          T={T}
          proj={proj}
          onClose={() => setModal(null)}
          onOk={replicarTorre}
        />
      )}

      {modal === "replanejamento" && (
        <ModalReplanejamento
          T={T}
          torreNome={torreAtiva()?.nome}
          onClose={() => setModal(null)}
          onExportarModelo={() =>
            exportarModeloReplanejamento({
              proj,
              torreId: filtroTorre,
              flash,
            })
          }
          onImportarArquivo={importarArquivo}
        />
      )}

      {modal?.tipo === "gerar" && (
        <ModalGerar
          T={T}
          onClose={() => setModal(null)}
          onOk={(cfg) => gerarPavimentos(modal.torreId, cfg)}
        />
      )}

      {modal?.tipo === "aplicarMacrofluxo" && (
        <ModalAplicarMacrofluxo
          T={T}
          proj={proj}
          setProj={setProj}
          torreId={modal.torreId}
          macroIdInicial={modal.macroId}
          onClose={() => setModal(null)}
          onAplicar={(cfg) => {
            aplicarMacrofluxo(cfg);
            setModal(null);
          }}
        />
      )}

      {modalConfirmacao && (
        <ModalConfirmarExclusao
          T={T}
          titulo={modalConfirmacao.titulo}
          mensagem={modalConfirmacao.mensagem}
          itemNome={modalConfirmacao.itemNome}
          textoBotao={modalConfirmacao.textoBotao}
          onConfirmar={modalConfirmacao.onConfirmar}
          onCancelar={() => setModalConfirmacao(null)}
        />
      )}
    </div>
  );
}
