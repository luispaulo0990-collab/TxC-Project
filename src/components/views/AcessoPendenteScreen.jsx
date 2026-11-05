import React from "react";
import { LogOut } from "lucide-react";
import { AuthLayout, AvisoAuth, BotaoAuth } from "./AuthLayout";

/** Login válido, mas o perfil ainda não foi liberado pela gestão (profiles.active = false). */
export function AcessoPendenteScreen({ tema, email, onLogout }) {
  return (
    <AuthLayout tema={tema} titulo="Acesso aguardando liberação">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <AvisoAuth tone="warning">
          Seu login ({email || "e-mail"}) está correto, mas o acesso ainda não foi liberado. Peça à gestão para ativar seu perfil e
          definir seu cargo (admin ou visualizador).
        </AvisoAuth>
        <BotaoAuth tema={tema} icon={LogOut} onClick={onLogout}>
          Sair e continuar como visualizador
        </BotaoAuth>
      </div>
    </AuthLayout>
  );
}
