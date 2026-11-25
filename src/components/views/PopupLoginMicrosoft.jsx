import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { prepararPopupLogin } from "../../utils/authMicrosoft";
import { ORANGE, INK, FONT, FONT_DISPLAY, THEME, RADIUS, SHADOW, STATUS } from "../../constants/theme";
import { LogoUnita } from "../common/LogoUnita";

/**
 * Tela do pop-up de login aberto pelo app dentro do iframe do Portal Unità.
 * modo "popup": combina o pedido com o app e segue para a Microsoft.
 * modo "fim":   a Microsoft devolveu; o app no portal conclui o login sozinho e esta janela fecha.
 */
export function PopupLoginMicrosoft({ modo }) {
  const T = THEME.claro;
  const erroUrl = new URLSearchParams(window.location.search).get("login_erro");
  const [estado, setEstado] = useState(modo === "fim" ? (erroUrl ? "erro" : "ok") : "abrindo");
  const [mensagem, setMensagem] = useState(erroUrl || "");

  useEffect(() => {
    if (modo === "popup") {
      if (window.__txcPopupPreparado) return; // evita rodar duas vezes (StrictMode em desenvolvimento)
      window.__txcPopupPreparado = true;
      prepararPopupLogin().catch((e) => {
        setEstado("erro");
        setMensagem(e?.message || "Não foi possível iniciar o login.");
      });
    } else if (!erroUrl) {
      const t = setTimeout(() => window.close(), 900);
      return () => clearTimeout(t);
    }
  }, [modo, erroUrl]);

  const Icone = estado === "ok" ? CheckCircle2 : estado === "erro" ? AlertCircle : Loader2;
  const cor = estado === "ok" ? STATUS.success : estado === "erro" ? STATUS.error : ORANGE;
  const titulo =
    estado === "ok" ? "Login concluído" : estado === "erro" ? "Não foi possível entrar" : "Abrindo a Microsoft…";
  const texto =
    estado === "ok"
      ? "Pode voltar para o app no portal. Esta janela vai fechar sozinha."
      : estado === "erro"
      ? mensagem
      : "Escolha a sua conta corporativa da Unità na próxima tela.";

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, fontFamily: FONT, color: T.text,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        width: "100%", maxWidth: 400, background: T.panel, borderRadius: RADIUS.card,
        boxShadow: SHADOW.overlay, overflow: "hidden", border: `1px solid ${T.lineSoft}`,
      }}>
        <div style={{
          background: INK, borderBottom: `2px solid ${ORANGE}`, padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <LogoUnita ink="#fff" height={26} />
          <span style={{ width: 1, height: 20, background: "rgb(255 255 255 / 0.16)" }} />
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Tempo × Caminho</span>
        </div>
        <div style={{ padding: "26px 24px", textAlign: "center" }}>
          <Icone size={36} color={cor} className={estado === "abrindo" ? "animate-spin" : undefined} style={{ margin: "0 auto" }} />
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, margin: "14px 0 6px" }}>{titulo}</h1>
          <p style={{ margin: 0, fontSize: 14.5, color: estado === "erro" ? STATUS.error : T.muted }}>{texto}</p>
          {estado !== "abrindo" && (
            <button
              onClick={() => window.close()}
              style={{
                marginTop: 18, height: 40, padding: "0 18px", borderRadius: RADIUS.control,
                border: `1px solid ${T.line}`, background: T.panel, color: T.text,
                fontSize: 14.5, fontWeight: 500, fontFamily: FONT, cursor: "pointer",
              }}
            >
              Fechar janela
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
