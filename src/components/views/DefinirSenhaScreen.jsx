import React, { useState } from "react";
import { Lock, KeyRound, ArrowLeft } from "lucide-react";
import { atualizarSenha } from "../../utils/supabaseClient";
import { SENHA_MIN } from "../../constants/acesso";
import { AuthLayout, AvisoAuth, BotaoAuth, CampoAuth, estiloInputAuth } from "./AuthLayout";

/**
 * Destino do link de convite e do "esqueci minha senha". O Supabase abre a sessão
 * a partir do link; aqui a pessoa define a nova senha.
 */
export function DefinirSenhaScreen({ tema, email, convite, onConcluir, onVoltar }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const inputStyle = estiloInputAuth(tema);

  // Sem sessão: o link expirou ou já foi usado
  if (!email) {
    return (
      <AuthLayout tema={tema} titulo="Link inválido ou expirado">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AvisoAuth tone="warning">
            Peça um novo link em “Esqueci minha senha”. Cada link vale uma vez e por pouco tempo.
          </AvisoAuth>
          <BotaoAuth variant="secondary" tema={tema} onClick={onVoltar}>
            <ArrowLeft size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Voltar para o app
          </BotaoAuth>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    if (password.length < SENHA_MIN) return setErro(`Use pelo menos ${SENHA_MIN} caracteres.`);
    if (password !== confirm) return setErro("As duas senhas não são iguais.");
    setLoading(true);
    try {
      const user = await atualizarSenha(password);
      await onConcluir(user);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout tema={tema} titulo={convite ? "Defina sua senha" : "Nova senha"} descricao={`Para ${email}.`}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <CampoAuth label="Nova senha" icon={Lock} tema={tema} hint={`Pelo menos ${SENHA_MIN} caracteres.`}>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            disabled={loading}
            style={inputStyle}
          />
        </CampoAuth>
        <CampoAuth label="Repita a nova senha" icon={Lock} tema={tema}>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            disabled={loading}
            style={inputStyle}
          />
        </CampoAuth>
        {erro && <AvisoAuth>{erro}</AvisoAuth>}
        <BotaoAuth type="submit" tema={tema} loading={loading} loadingText="Salvando..." icon={KeyRound}>
          Salvar nova senha
        </BotaoAuth>
      </form>
    </AuthLayout>
  );
}
