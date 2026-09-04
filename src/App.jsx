import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

import { THEME, FONT, BLACK, DIAS_MES } from "./constants/theme";
import { D, iso, addDays, diffDays, uid, hoje, parseData, fmtBR } from "./utils/dateUtils";
import { segIntersect, normalizar } from "./utils/geometryUtils";
import { storage } from "./utils/storageUtils";
import { buildSVG, exportarPNG, baixar, exportarCSV, exportarJSON, exportarExcel, exportarXML, exportarModeloReplanejamento } from "./utils/exportUtils";
import { seedProject } from "./data/seedProject";

import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { PropertiesPanel } from "./components/layout/PropertiesPanel";
import { StatusBar } from "./components/layout/StatusBar";
import { FlowlineChart } from "./components/chart/FlowlineChart";
import { Resumo } from "./components/views/Resumo";
import { MetasView } from "./components/views/MetasView";
import { MacrofluxoView } from "./components/views/MacrofluxoView";

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
import { gerarAtividadesDoMacrofluxo } from "./utils/macrofluxoUtils";
import { apiClient } from "./utils/apiClient";
import { obterSessao, logout } from "./utils/supabaseClient";
import { usePermissao } from "./hooks/usePermissao";
import { Loader2 } from "lucide-react";

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [gruposUsuario, setGruposUsuario] = useState([]);  // grupos do usuário
  const [grupoAtivo, setGrupoAtivo] = useState(null); // id do grupo selecionado
  const [tela, setTela] = useState("home"); // "home" | "editor"
  const [proj, setProj] = useState(null);
  const [selId, setSelId] = useState(null);
  const [pxPerDay, setPxPerDay] = useState(3.4);
  const [rowH] = useState(23);
  const [snapWeek] = useState(false);
  const [tab, setTab] = useState("atividades");
  const [filtroTorre, setFiltroTorre] = useState("TODAS");
  const [salvos, setSalvos] = useState([]);
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [showProps, setShowProps] = useState(true);
  const [tema, setTema] = useState("claro");
  const [vista, setVista] = useState("grafico"); // grafico | resumo

  const T = THEME[tema];
  const chartRef = useRef(null);
  const axisRef = useRef(null);
  const fileRef = useRef(null);
  const importTipo = useRef("plan"); // plan | real | falta
  const drag = useRef(null);
  const saveTimer = useRef(null);

  const flash = useCallback((m) => {
    setStatus(m);
    setTimeout(() => setStatus(""), 2800);
  }, []);

  /* ─── Persistência (Supabase Backend + Local Fallback) ───────── */
  const listar = useCallback(async () => {
    try {
      // 1. Tentar buscar do backend Supabase primeiro
      const serverProjetos = await apiClient.getProjetos();
      if (Array.isArray(serverProjetos) && serverProjetos.length > 0) {
        const listaFormatada = serverProjetos.map((item) => {
          const p = item.dados || item;
          return {
            id: item.id,
            nome: item.nome || p.nome || "Sem nome",
            em: item.updated_at ? new Date(item.updated_at).getTime() : Date.now(),
            nTorres: p.torres?.length ?? 0,
            nAtividades: p.atividades?.length ?? 0,
            user_id: item.user_id ?? null,
            grupo_id: item.grupo_id ?? null,
          };
        });
        setSalvos(listaFormatada);

        // Atualizar cache local
        await storage.set(
          "lob:index",
          JSON.stringify(listaFormatada.map((x) => ({ id: x.id, nome: x.nome, em: x.em })))
        );
        for (const item of serverProjetos) {
          if (item.dados) {
            await storage.set(`lob:proj:${item.id}`, JSON.stringify(item.dados));
          }
        }
        return listaFormatada;
      }

      // 2. Fallback para storage local
      const r = await storage.get("lob:index");
      const lista = r ? JSON.parse(r.value) : [];
      const listaEnriquecida = await Promise.all(
        lista.map(async (item) => {
          try {
            const rp = await storage.get(`lob:proj:${item.id}`);
            if (rp) {
              const p = JSON.parse(rp.value);
              return { ...item, nTorres: p.torres?.length ?? 0, nAtividades: p.atividades?.length ?? 0 };
            }
          } catch {}
          return item;
        })
      );
      setSalvos(listaEnriquecida);
      return listaEnriquecida;
    } catch (err) {
      console.warn("Erro ao listar projetos:", err);
      setSalvos([]);
      return [];
    }
  }, []);

  // Na inicialização: sempre exigir autenticação ao abrir o link
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lob:auth_token");
      localStorage.removeItem("lob:user");
    }
    setAuthLoading(false);
  }, []);

  /** Carrega os grupos do usuário logado e determina seu papel */
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
        // Selecionar automaticamente o primeiro grupo se houver apenas um
        if (Array.isArray(data) && data.length === 1) {
          setGrupoAtivo(data[0].id);
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar grupos:", e);
    }
  }, []);

  // Na inicialização: carregar lista e verificar se há parâmetro ?obra=ID ou ?p=ID na URL
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
        // 1. Salvar no Storage local imediatamente
        await storage.set(`lob:proj:${p.id}`, JSON.stringify(p));
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

        // 2. Sincronizar em segundo plano com o Supabase via Backend Proxy
        const savedProject = await apiClient.salvarProjeto(p);
        if (!savedProject) {
          throw new Error("Não foi possível sincronizar a obra com o servidor");
        }

        if (!silencioso) flash("Empreendimento salvo no Supabase");
      } catch {
        if (!silencioso) flash("Não foi possível salvar");
      }
    },
    [flash]
  );

  useEffect(() => {
    if (!proj) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => salvar(proj, true), 1200);
    return () => clearTimeout(saveTimer.current);
  }, [proj, salvar]);

  const abrir = async (id) => {
    try {
      // Tentar Supabase backend primeiro
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

      // Fallback local
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

  /* ─── Seleção de Obra na HomeScreen ──────────────────────────── */
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

  /* ─── Criar Nova Obra ────────────────────────────────────────── */
  const criarNovaObra = async (novoProjeto) => {
    setProj(novoProjeto);
    await salvar(novoProjeto, true);
    await listar();
    setSelId(null);
    setFiltroTorre("TODAS");
    setVista("grafico");
    setModal(null);
    setTela("editor");
    flash(`Obra "${novoProjeto.nome}" criada e salva no Supabase!`);
  };

  /* ─── Excluir Obra ───────────────────────────────────────────── */
  const excluirObra = async (id) => {
    try {
      // 1. Remover local
      await storage.remove(`lob:proj:${id}`);
      const r = await storage.get("lob:index");
      const idx = r ? JSON.parse(r.value) : [];
      const novoIdx = idx.filter((e) => e.id !== id);
      await storage.set("lob:index", JSON.stringify(novoIdx));
      setSalvos((prev) => prev.filter((e) => e.id !== id));

      // 2. Remover no Supabase
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

  /* ─── Voltar para HomeScreen (salva automaticamente) ─────────── */
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

  const chartW = Math.round(Math.max(1, diffDays(t0, t1)) * pxPerDay);
  const chartH = rows.length * rowH;
  const xOf = useCallback((d) => diffDays(t0, d) * pxPerDay, [t0, pxPerDay]);
  const yMid = useCallback((id) => (rowIdx[id] ?? 0) * rowH + rowH / 2, [rowIdx, rowH]);

  const meses = useMemo(() => {
    const MESES_ABR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const out = [];
    let cur = new Date(t0.getFullYear(), t0.getMonth(), 1);
    while (cur <= t1) {
      const prox = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const semanas = [];
      [1, 8, 15, 22, 29].forEach((dia, i) => {
        const d = new Date(cur.getFullYear(), cur.getMonth(), dia);
        if (d < prox && d >= t0 && d <= t1) semanas.push({ d, n: i + 1 });
      });
      out.push({
        ini: cur,
        fim: prox,
        label: `${MESES_ABR[cur.getMonth()]}/${String(cur.getFullYear()).slice(2)}`,
        semanas,
      });
      cur = prox;
    }
    return out;
  }, [t0, t1]);

  /* ─── Métricas de Produção ──────────────────────────────────── */
  const metrica = useCallback(
    (a) => {
      const i = rowIdx[a.locIniId],
        f = rowIdx[a.locFimId];
      const nLoc = i == null || f == null ? 0 : Math.abs(f - i) + 1;
      const dias = Math.max(1, diffDays(D(a.dataIni), D(a.dataFim)));
      return {
        nLoc,
        dias,
        ritmoMes: (nLoc / dias) * DIAS_MES,
        diasPorPav: dias / Math.max(1, nLoc),
        meses: dias / DIAS_MES,
      };
    },
    [rowIdx]
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
          { x: diffDays(t0, D(a.dataIni)), y: rowIdx[a.locIniId] },
          { x: diffDays(t0, D(a.dataFim)), y: rowIdx[a.locFimId] },
          { x: diffDays(t0, D(b.dataIni)), y: rowIdx[b.locIniId] },
          { x: diffDays(t0, D(b.dataFim)), y: rowIdx[b.locFimId] }
        );
        if (p) {
          const r = rows[Math.round(p.y)];
          out.push({
            id: `${a.id}-${b.id}`,
            aId: a.id,
            bId: b.id,
            texto: `${a.nome} cruza ${b.nome}`,
            onde: r ? r.nome : "—",
            quando: FMT_BR(addDays(t0, Math.round(p.x))),
            x: p.x * pxPerDay,
            y: p.y * rowH + rowH / 2,
          });
        }
      }
    }
    return out;
  }, [proj?.atividades, rowIdx, rows, t0, pxPerDay, rowH]);

  /* ─── Ações de Atividades ───────────────────────────────────── */
  const upA = (id, patch) =>
    setProj((p) => ({
      ...p,
      atividades: p.atividades.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));

  const sel = proj ? (proj.atividades.find((a) => a.id === selId) || null) : null;
  const torreAtiva = () => proj ? (proj.torres.find((x) => x.id === filtroTorre) || proj.torres[0]) : null;

  const novaAtividade = () => {
    const t = torreAtiva();
    const ls = proj.locais.filter((l) => l.torreId === t.id).sort((a, b) => a.ordem - b.ordem);
    if (!ls.length) return flash("Crie pavimentos antes de criar atividades");
    const base = D(proj.dataZero);
    const a = {
      id: uid(),
      torreId: t.id,
      nome: "Nova atividade",
      cor: BLACK,
      modo: "LINHA",
      visivel: true,
      locIniId: ls[0].id,
      locFimId: ls[ls.length - 1].id,
      dataIni: iso(base),
      dataFim: iso(addDays(base, 90)),
      realIni: null,
      realFim: null,
    };
    setProj((p) => ({ ...p, atividades: [...p.atividades, a] }));
    setSelId(a.id);
    setShowProps(true);
    setTab("atividades");
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

  /* ─── Importação de Planilha Excel ──────────────────────────── */
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
    const ls = proj.locais.filter((l) => l.torreId === t.id).sort((a, b) => a.ordem - b.ordem);
    if (!ls.length) {
      setModal(null);
      return flash("Crie pavimentos antes de importar");
    }
    const tipo = importTipo.current;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
      let hi = -1,
        cA = -1,
        cI = -1,
        cF = -1;
      for (let i = 0; i < Math.min(linhas.length, 20); i++) {
        const cols = (linhas[i] || []).map(normalizar);
        const a = cols.findIndex((c) => c.startsWith("atividade") || c === "servico" || c === "serviço");
        const b = cols.findIndex((c) => c.startsWith("inicio"));
        const f = cols.findIndex((c) => c.startsWith("fim") || c.startsWith("termino"));
        if (a >= 0 && b >= 0 && f >= 0) {
          hi = i;
          cA = a;
          cI = b;
          cF = f;
          break;
        }
      }
      if (hi < 0) {
        setModal(null);
        return flash("Cabeçalho não encontrado. Use Atividade, Inicio e Fim.");
      }

      const registros = [];
      for (let i = hi + 1; i < linhas.length; i++) {
        const r = linhas[i] || [];
        const nome = String(r[cA] ?? "").trim();
        if (!nome) continue;
        const di = parseData(r[cI]),
          df = parseData(r[cF]);
        if (!di || !df || df <= di) continue;
        registros.push({ nome, di, df });
      }
      if (!registros.length) {
        setModal(null);
        return flash("Nenhuma linha válida na planilha");
      }

      if (tipo === "plan" || tipo === "falta") {
        const novas = registros.map((r) => ({
          id: uid(),
          torreId: t.id,
          nome: r.nome,
          cor: BLACK,
          modo: "LINHA",
          visivel: true,
          locIniId: ls[0].id,
          locFimId: ls[ls.length - 1].id,
          dataIni: iso(r.di),
          dataFim: iso(r.df),
          realIni: null,
          realFim: null,
        }));
        setProj((p) => ({ ...p, atividades: [...p.atividades, ...novas] }));
        setModal(null);
        setFiltroTorre(t.id);
        flash(`${novas.length} atividades ${tipo === "falta" ? "a executar " : ""}importadas para ${t.nome}`);
      } else {
        const existentes = proj.atividades.filter((a) => a.torreId === t.id);
        let casadas = 0;
        const upd = {};
        registros.forEach((r) => {
          const alvo = existentes.find((a) => normalizar(a.nome) === normalizar(r.nome));
          if (alvo) {
            upd[alvo.id] = { realIni: iso(r.di), realFim: iso(r.df) };
            casadas++;
          }
        });
        setProj((p) => ({ ...p, atividades: p.atividades.map((a) => (upd[a.id] ? { ...a, ...upd[a.id] } : a)) }));
        setModal(null);
        flash(
          casadas
            ? `Realizado importado · ${casadas} atividades casadas por nome`
            : "Nenhum nome coincidiu com as atividades da torre"
        );
      }
    } catch {
      setModal(null);
      flash("Não foi possível ler o arquivo");
    }
  };

  /* ─── Importação de Replanejamento ─────────────────────────── */
  const importarReplanejamento = async (file) => {
    if (!file) return;
    const t = torreAtiva();
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      // Tenta ler aba "Replanejamento" primeiro, senão usa a primeira aba
      const sheetName = wb.SheetNames.includes("Replanejamento")
        ? "Replanejamento"
        : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const linhas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

      let hi = -1, cA = -1, cI = -1, cF = -1;
      for (let i = 0; i < Math.min(linhas.length, 20); i++) {
        const cols = (linhas[i] || []).map(normalizar);
        const a = cols.findIndex((c) => c.startsWith("atividade") || c === "servico" || c === "serviço");
        const b = cols.findIndex((c) => c.startsWith("inicio"));
        const f = cols.findIndex((c) => c.startsWith("fim") || c.startsWith("termino"));
        if (a >= 0 && b >= 0 && f >= 0) { hi = i; cA = a; cI = b; cF = f; break; }
      }
      if (hi < 0) {
        setModal(null);
        return flash("Cabeçalho não encontrado. Use Atividade, Inicio e Fim.");
      }

      const registros = [];
      for (let i = hi + 1; i < linhas.length; i++) {
        const r = linhas[i] || [];
        const nome = String(r[cA] ?? "").trim();
        if (!nome) continue;
        const di = parseData(r[cI]), df = parseData(r[cF]);
        if (!di || !df || df <= di) continue;
        registros.push({ nome, di, df });
      }
      if (!registros.length) {
        setModal(null);
        return flash("Nenhuma linha válida na planilha");
      }

      const existentes = proj.atividades.filter((a) => a.torreId === t.id);
      let atualizadas = 0;
      const upd = {};
      registros.forEach((r) => {
        const alvo = existentes.find((a) => normalizar(a.nome) === normalizar(r.nome));
        if (alvo) {
          upd[alvo.id] = { dataIni: iso(r.di), dataFim: iso(r.df) };
          atualizadas++;
        }
      });
      setProj((p) => ({
        ...p,
        atividades: p.atividades.map((a) => (upd[a.id] ? { ...a, ...upd[a.id] } : a)),
      }));
      setModal(null);
      flash(
        atualizadas
          ? `Replanejamento aplicado · ${atualizadas} atividade${atualizadas > 1 ? "s" : ""} atualizadas em ${t.nome}`
          : "Nenhum nome coincidiu com as atividades da torre"
      );
    } catch {
      setModal(null);
      flash("Não foi possível ler o arquivo");
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
      const novaDataFim = iso(addDays(D(a.dataIni), dias));
      upA(id, { dataFim: novaDataFim });
    },
    [proj?.atividades, metrica, upA]
  );

  const ajustarDias = useCallback(
    (id, novosDias) => {
      const a = proj ? proj.atividades.find((x) => x.id === id) : null;
      if (!a) return;
      const d = Math.max(1, Number(novosDias) || 1);
      const novaDataFim = iso(addDays(D(a.dataIni), d));
      upA(id, { dataFim: novaDataFim });
    },
    [proj?.atividades, upA]
  );

  /* ─── Arraste Interativo no Gráfico (Translação, Inclinação e Escopo) ─── */
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
      nextDi = iso(addDays(D(g.di), dd));
      nextDf = iso(addDays(D(g.df), dd));
      upA(g.id, {
        dataIni: nextDi,
        dataFim: nextDf,
      });
    } else if (g.modo === "ini") {
      const nd = addDays(D(g.di), dd);
      if (diffDays(nd, D(g.df)) >= 1) {
        nextDi = iso(nd);
        nextLi = alvo(g.li);
        upA(g.id, { dataIni: nextDi, locIniId: nextLi });
      }
    } else if (g.modo === "fim" || g.modo === "tilt" || g.modo === "speed") {
      const nd = addDays(D(g.df), dd);
      if (diffDays(D(g.di), nd) >= 1) {
        nextDf = iso(nd);
        if (g.modo === "fim") nextLf = alvo(g.lf);
        upA(g.id, { dataFim: nextDf, ...(g.modo === "fim" ? { locFimId: nextLf } : {}) });
      }
    }

    const dur = Math.max(1, diffDays(D(nextDi), D(nextDf)));
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

  /* ─── Arraste da Barra Lateral para o Gráfico (Drop no Cronograma) ─── */
  const handleDropActivityFromSidebar = (actId, offsetX, offsetY) => {
    if (!proj || !proj.atividades) return;
    const a = proj.atividades.find((x) => x.id === actId);
    if (!a) return;
    const dIni = a.dataIni ? D(a.dataIni) : new Date();
    const dFim = a.dataFim ? D(a.dataFim) : addDays(dIni, 30);
    const duracaoDias = Math.max(1, diffDays(dIni, dFim));
    const diffDaysDropped = Math.round(offsetX / Math.max(0.1, pxPerDay));
    const targetDate = addDays(t0, diffDaysDropped);
    const targetDataFim = addDays(targetDate, duracaoDias);

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

  /* ─── Exportação ────────────────────────────────────────────── */
  const doExport = (formato, nomeBase) => {
    if ((formato === "svg" || formato === "png") && !chartRef.current) {
      flash("Abra a aba Gráfico para exportar a imagem");
      return;
    }

    if (formato === "svg") {
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
      const nome = (nomeBase || proj.nome || "tempo-x-caminho").replace(/[\/\\:*?"<>|]/g, "-");
      baixar(`${nome}.svg`, svgString, "image/svg+xml;charset=utf-8", flash);
      if (flash) flash("SVG exportado");
      return;
    }

    if (formato === "xlsx") {
      exportarExcel({ proj, rows, rowIdx, metrica, pavimentoHoje, nomeBase, flash });
      return;
    }

    if (formato === "xml") {
      exportarXML({ proj, rows, rowIdx, metrica, pavimentoHoje, nomeBase, flash });
      return;
    }

    if (formato === "csv") {
      exportarCSV({ proj, rows, rowIdx, metrica, nomeBase, flash });
      return;
    }

    if (formato === "json") {
      exportarJSON({ proj, nomeBase, flash });
      return;
    }

    if (formato === "png") {
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

  const carregarProjetoJSON = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data && data.torres && data.locais && data.atividades) {
        if (!data.id) data.id = uid();
        setProj(data);
        salvar(data, true);
        setSelId(null);
        setModal(null);
        flash(`Empreendimento "${data.nome}" carregado com sucesso!`);
      } else {
        flash("Arquivo JSON inválido para projeto Tempo x Caminho");
      }
    } catch {
      flash("Erro ao ler o arquivo JSON");
    }
  };

  /* ─── Estrutura e Pavimentos ────────────────────────────────── */
  const gerarPavimentos = (torreId, { subsolos, tipo, cobertura, tampa }) => {
    const ls = [];
    let o = 0;
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

  const addTorreVazia = () => {
    setProj((p) => ({
      ...p,
      torres: [...p.torres, { id: uid(), nome: `Torre ${p.torres.length + 1}`, offsetDias: 0, origem: null }],
    }));
  };

  const ativVisiveis = proj ? proj.atividades.filter(
    (a) => a.visivel !== false && rowIdx[a.locIniId] != null && rowIdx[a.locFimId] != null
  ) : [];

  /* Pavimento onde a atividade está hoje (interpolação sobre o planejado) */
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

  /* ─── Render: Autenticação, HomeScreen ou Editor ──────────── */
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

  // Determinar papel do usuário no grupo ativo
  const grupoAtivoObj = gruposUsuario.find((g) => g.id === grupoAtivo);
  // Sem grupo, a conta continua no modo individual com acesso completo às próprias obras.
  const userRoleNoGrupo = grupoAtivoObj?.meu_role
    ?? gruposUsuario[0]?.meu_role
    ?? "admin";
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const permissao = usePermissao(userRoleNoGrupo);

  if (tela === "home") {
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
          onNovaObra={permissao.podeCriar ? () => setModal("novaObra") : undefined}
          onExcluirObra={permissao.podeExcluir ? excluirObra : undefined}
          onGerenciarGrupos={permissao.podeGerenciar ? () => setModal("gerenciarGrupo") : undefined}
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
      </>
    );
  }

  if (!proj) return null;

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden" style={{ background: T.bg, fontFamily: FONT, color: T.text }}>
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

      {/* ── Barra Superior (Header) ── */}
      <Header
        proj={proj}
        setProj={setProj}
        vista={vista}
        setVista={setVista}
        filtroTorre={filtroTorre}
        setFiltroTorre={setFiltroTorre}
        tema={tema}
        setTema={setTema}
        pxPerDay={pxPerDay}
        setPxPerDay={setPxPerDay}
        onAbrirModal={setModal}
        onSalvar={salvar}
        onVoltarHome={voltarParaHome}
      />

      {/* ── Visualização Alternável (Resumo Executivo, Metas Lookahead, Macrofluxo ou Gráfico Interativo) ── */}
      {vista === "resumo" ? (
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
          {/* Painel Esquerdo */}
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
            upA={upA}
            onNovaAtividade={novaAtividade}
            onAbrirModal={setModal}
            onExcluirTorre={excluirTorre}
            onAddTorreVazia={addTorreVazia}
          />

          {/* Gráfico Central */}
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
              pxPerDay={pxPerDay}
              xOf={xOf}
              yMid={yMid}
              ativVisiveis={ativVisiveis}
              alertas={alertas}
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

            {/* Barra Inferior com Alertas */}
            <StatusBar
              T={T}
              alertas={alertas}
              status={status}
              onSelectConflito={(aId) => {
                setSelId(aId);
                setShowProps(true);
              }}
            />
          </div>

          {/* Painel Direito de Propriedades */}
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
            onExcluir={excluir}
          />
        </div>
      )}

      {/* ── Modais ── */}
      {modal === "importmenu" && (
        <ModalImportMenu
          T={T}
          torreNome={torreAtiva()?.nome}
          onClose={() => setModal(null)}
          onSelectTipo={abrirImport}
        />
      )}

      {modal === "importar" && (
        <ModalImportar
          T={T}
          tipo={importTipo.current}
          onClose={() => setModal(null)}
          onPickFile={() => fileRef.current?.click()}
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
          onCarregarJSON={carregarProjetoJSON}
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
          onImportarArquivo={importarReplanejamento}
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
    </div>
  );
}
