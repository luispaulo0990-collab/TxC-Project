/**
 * Tela de login Unità — versão React do "Kit - Tela de Login Unità".
 * Origem: Cadastro de Fornecedores (layout do Relatório de Aporte, com a marca Unità).
 *
 * Só desenha a tela. Os botões / formulário de entrar vêm como filhos, então o login
 * da ferramenta continua exatamente como está.
 *
 * Precisa da pasta public/unita-login/ (imagens + CSS): o componente carrega o CSS
 * de lá sozinho. Todas as classes começam com "ul-" e ficam dentro de .ul-login.
 */
import React, { useState } from "react";

export function UnitaLogin({
  area,
  ferramenta,
  descricao,
  titulo = "Bem-vindo",
  subtitulo = "Entre com a sua conta corporativa para acessar a ferramenta.",
  erro,
  rodape = "Unità Engenharia · uso interno",
  pastaMarca = "/unita-login",
  children,
}) {
  const [erroDoEndereco] = useState(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("erro"),
  );
  const mensagem = erro === undefined ? erroDoEndereco : erro;

  return (
    <>
      <link rel="stylesheet" href={`${pastaMarca}/unita-login.css`} />
      <div className="ul-login">
        <aside className="ul-marca">
          <img className="ul-padrao" src={`${pastaMarca}/pattern-un.png`} alt="" aria-hidden />
          <img className="ul-logo" src={`${pastaMarca}/logo-unita-white.png`} alt="Unità Engenharia" />
          <div className="ul-marca-texto">
            <p className="ul-sobretitulo">{area}</p>
            <h2>{ferramenta}</h2>
            {descricao && <p>{descricao}</p>}
          </div>
        </aside>

        <section className="ul-acesso">
          <div className="ul-cartao">
            <p className="ul-sobretitulo">Unità · {area}</p>
            <h1>{titulo}</h1>
            <p className="ul-subtitulo">{subtitulo}</p>
            {mensagem && (
              <div className="ul-aviso" role="alert">
                {mensagem}
              </div>
            )}
            <div className="ul-conteudo">{children}</div>
          </div>
          <p className="ul-rodape">{rodape}</p>
        </section>
      </div>
    </>
  );
}

/** Logo oficial da Microsoft (4 quadrados, cores da marca Microsoft). */
export function LogoMicrosoft() {
  return (
    <svg className="ul-ms-logo" viewBox="0 0 21 21" aria-hidden>
      <path fill="#f25022" d="M0 0h10v10H0z" />
      <path fill="#7fba00" d="M11 0h10v10H11z" />
      <path fill="#00a4ef" d="M0 11h10v10H0z" />
      <path fill="#ffb900" d="M11 11h10v10H11z" />
    </svg>
  );
}
