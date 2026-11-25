import React, { useEffect, useState } from "react";
import { Sparkles, Palette, KeyRound, FolderTree, CalendarRange, ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { supabasePublic } from "../../utils/supabaseClient";
import { ORANGE, ORANGE_HOVER, INK, FONT, FONT_DISPLAY, THEME, RADIUS, SHADOW, OVERLAY } from "../../constants/theme";
import { LogoUnita } from "../common/LogoUnita";

/**
 * Trilha de novidades: aparece UMA vez por perfil, no próximo acesso logado.
 * Para mostrar uma trilha nova no futuro, troque NOVIDADES_VERSAO e os passos.
 * A versão vista fica em public.profiles.novidades_vistas (migration_novidades_vistas.sql).
 */
export const NOVIDADES_VERSAO = "2026-11-v2";

const passos = (podeOrganizar) => [
  {
    icon: Sparkles,
    eyebrow: "Novidades",
    titulo: "O Tempo × Caminho foi atualizado",
    texto: "Preparamos algumas melhorias para o seu dia a dia. Veja em menos de um minuto o que mudou.",
    itens: ["Visual novo", "Login com Microsoft 365", "Pastas de obras", "Dezembro e janeiro completos"],
  },
  {
    icon: Palette,
    eyebrow: "1 de 4 · Visual",
    titulo: "Visual novo, mesmas funções",
    texto: "O app segue o padrão visual mais recente da Unità: mais limpo, com melhor leitura e uso do espaço.",
    itens: [
      "Nada mudou de lugar: menus, gráfico e painéis continuam onde estavam.",
      "O tema claro/escuro continua no menu lateral.",
    ],
  },
  {
    icon: KeyRound,
    eyebrow: "2 de 4 · Acesso",
    titulo: "Entrar com Microsoft 365",
    texto: "Agora o acesso é feito com a sua conta corporativa da Unità, a mesma do Outlook e do Teams.",
    itens: [
      "Clique em Entrar → Entrar com Microsoft.",
      "Não é preciso decorar outra senha.",
      "Sem login, o app continua aberto para consulta como visualizador.",
    ],
  },
  {
    icon: FolderTree,
    eyebrow: "3 de 4 · Tela inicial",
    titulo: "Obras organizadas em pastas",
    texto: "A tela inicial agora pode agrupar as obras em pastas, por incorporador ou empreendimento.",
    itens: podeOrganizar
      ? [
          "Crie pastas em Nova pasta. O app sugere os incorporadores já cadastrados.",
          "Para mover uma obra, use o botão Mover no card ou arraste o card até a pasta.",
          "Excluir uma pasta não exclui obras: elas voltam para Suas Obras.",
        ]
      : [
          "Clique em uma pasta para ver as obras dela.",
          "Use Suas Obras, no topo, para voltar.",
          "As abas Ativas / Arquivadas / Todas valem dentro de cada pasta.",
        ],
  },
  {
    icon: CalendarRange,
    eyebrow: "4 de 4 · Calendário",
    titulo: "Dezembro e janeiro completos",
    texto: "O gráfico passa a mostrar dezembro e janeiro inteiros, com todas as semanas, como os outros meses.",
    itens: [
      "O app não aplica mais recesso automático no fim e no início do ano.",
      "Quem decide se as atividades acontecem nesse período é o planejamento.",
      "Finais de semana e feriados nacionais continuam valendo.",
    ],
  },
];

export function NovidadesTour({ user, userRole, tema = "claro" }) {
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState(0);
  const T = THEME[tema] || THEME.claro;
  const lista = passos(userRole === "dev" || userRole === "admin");
  const ultimo = passo === lista.length - 1;

  // Verifica (uma vez por login) se este perfil já viu esta versão da trilha
  useEffect(() => {
    // Só em desenvolvimento local: ?novidades=1 abre a trilha sem gravar nada (para revisar o conteúdo)
    if (import.meta.env?.DEV && new URLSearchParams(window.location.search).get("novidades") === "1") {
      setPasso(0);
      setAberto(true);
      return;
    }
    const userId = user?.id;
    if (!userId) {
      setAberto(false);
      return;
    }
    let vivo = true;
    (async () => {
      const { data, error } = await supabasePublic
        .from("profiles")
        .select("novidades_vistas")
        .eq("id", userId)
        .maybeSingle();
      // coluna ainda não criada (migration não aplicada) ou perfil não encontrado: não mostra
      if (!vivo || error || !data) return;
      if (data.novidades_vistas === NOVIDADES_VERSAO) return;

      setPasso(0);
      setAberto(true);
      // marca como vista já ao abrir: a trilha aparece uma única vez por perfil
      const { error: errUpd } = await supabasePublic
        .from("profiles")
        .update({ novidades_vistas: NOVIDADES_VERSAO })
        .eq("id", userId);
      if (errUpd) console.warn("Não foi possível registrar a trilha de novidades como vista:", errUpd.message);
    })();
    return () => { vivo = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!aberto) return;
    const teclas = (e) => {
      if (e.key === "Escape") setAberto(false);
      if (e.key === "ArrowRight") setPasso((p) => Math.min(p + 1, lista.length - 1));
      if (e.key === "ArrowLeft") setPasso((p) => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", teclas);
    return () => window.removeEventListener("keydown", teclas);
  }, [aberto, lista.length]);

  if (!aberto) return null;

  const p = lista[passo];
  const Icon = p.icon;
  const nome = user?.perfil?.nome || user?.profile?.nome || user?.user_metadata?.nome || "";
  const primeiroNome = nome ? nome.split(" ")[0] : "";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000, background: OVERLAY, backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: FONT,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Novidades do Tempo × Caminho"
    >
      <div
        style={{
          width: "100%", maxWidth: 640, background: T.panel, color: T.text,
          borderRadius: RADIUS.card, boxShadow: SHADOW.overlay, overflow: "hidden",
          border: `1px solid ${T.lineSoft}`,
        }}
      >
        {/* Faixa da marca */}
        <div style={{
          background: INK, borderBottom: `2px solid ${ORANGE}`, position: "relative", overflow: "hidden",
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        }}>
          <img
            src="/brand/pattern-un.png" alt="" aria-hidden="true"
            style={{ position: "absolute", left: 0, bottom: -6, width: "200%", maxWidth: "none", opacity: 0.07, pointerEvents: "none" }}
          />
          <LogoUnita ink="#fff" height={26} />
          <span style={{ width: 1, height: 20, background: "rgb(255 255 255 / 0.16)" }} />
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Tempo × Caminho</span>
          <button
            onClick={() => setAberto(false)}
            title="Fechar"
            style={{
              marginLeft: "auto", position: "relative", background: "transparent", border: "none",
              color: "#C9C4C0", cursor: "pointer", padding: 6, borderRadius: 8, lineHeight: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo do passo */}
        <div style={{ display: "flex", gap: 22, padding: "26px 26px 8px", minHeight: 250 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, flexShrink: 0,
            background: T.primarySoft, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={30} color={ORANGE} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: ORANGE }}>
              {p.eyebrow}
            </div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, margin: "4px 0 6px", letterSpacing: "-0.01em" }}>
              {passo === 0 && primeiroNome ? `Olá, ${primeiroNome}! ${p.titulo}` : p.titulo}
            </h2>
            <p style={{ margin: 0, fontSize: 15, color: T.muted, lineHeight: 1.5 }}>{p.texto}</p>

            {passo === 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                {p.itens.map((it) => (
                  <span key={it} style={{
                    background: T.primarySoft, color: ORANGE, borderRadius: 999,
                    padding: "4px 12px", fontSize: 13.5, fontWeight: 500,
                  }}>
                    {it}
                  </span>
                ))}
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
                {p.itens.map((it) => (
                  <li key={it} style={{ display: "flex", gap: 10, fontSize: 14.5, lineHeight: 1.45 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 999, background: T.primarySoft, flexShrink: 0, marginTop: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Check size={12} color={ORANGE} strokeWidth={3} />
                    </span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Rodapé: progresso e navegação */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "16px 26px 20px",
          borderTop: `1px solid ${T.lineSoft}`, marginTop: 14,
        }}>
          <div style={{ display: "flex", gap: 6 }} aria-label={`Passo ${passo + 1} de ${lista.length}`}>
            {lista.map((_, i) => (
              <button
                key={i}
                onClick={() => setPasso(i)}
                title={`Ir para o passo ${i + 1}`}
                style={{
                  width: i === passo ? 22 : 8, height: 8, borderRadius: 999, border: "none", padding: 0,
                  background: i === passo ? ORANGE : T.line, cursor: "pointer", transition: "width .2s, background .2s",
                }}
              />
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {!ultimo && (
              <BotaoTrilha T={T} variante="ghost" onClick={() => setAberto(false)}>Pular</BotaoTrilha>
            )}
            {passo > 0 && (
              <BotaoTrilha T={T} variante="secondary" onClick={() => setPasso((x) => x - 1)}>
                <ArrowLeft size={15} /> Voltar
              </BotaoTrilha>
            )}
            {ultimo ? (
              <BotaoTrilha T={T} variante="primary" onClick={() => setAberto(false)}>
                <Check size={15} /> Começar a usar
              </BotaoTrilha>
            ) : (
              <BotaoTrilha T={T} variante="primary" onClick={() => setPasso((x) => x + 1)}>
                {passo === 0 ? "Ver novidades" : "Próximo"} <ArrowRight size={15} />
              </BotaoTrilha>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BotaoTrilha({ T, variante, children, onClick }) {
  const [h, setH] = useState(false);
  const estilos = {
    primary: { background: h ? ORANGE_HOVER : ORANGE, color: "#fff", border: "1px solid transparent", boxShadow: "0 2px 8px rgb(254 80 0 / 0.2)" },
    secondary: { background: h ? T.raised : T.panel, color: T.text, border: `1px solid ${T.line}` },
    ghost: { background: h ? T.hover : "transparent", color: T.muted, border: "1px solid transparent" },
  }[variante];
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 16px",
        borderRadius: RADIUS.control, fontSize: 14.5, fontWeight: 500, fontFamily: FONT, cursor: "pointer",
        transition: "background .15s", ...estilos,
      }}
    >
      {children}
    </button>
  );
}
