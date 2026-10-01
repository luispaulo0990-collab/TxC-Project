import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send, Trash2, User, Loader2 } from "lucide-react";
import { ORANGE, BLACK, FONT, NUM } from "../../constants/theme";
import { apiClient } from "../../utils/apiClient";
import { ModalConfirmarExclusao } from "../modals/ModalConfirmarExclusao";

export function ComentariosAtividade({ T, projetoId, atividadeId, user }) {
  const [comentarios, setComentarios] = useState([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [comentarioParaExcluir, setComentarioParaExcluir] = useState(null);

  const carregar = useCallback(async () => {
    if (!projetoId || !atividadeId) return;
    setCarregando(true);
    try {
      const dados = await apiClient.getComentariosAtividade(projetoId, atividadeId);
      setComentarios(dados);
    } finally {
      setCarregando(false);
    }
  }, [projetoId, atividadeId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleEnviar = async (e) => {
    e?.preventDefault();
    if (!novoTexto.trim() || enviando) return;
    const texto = novoTexto.trim();
    setEnviando(true);
    try {
      const criado = await apiClient.adicionarComentarioAtividade(projetoId, atividadeId, texto, user);
      if (criado) {
        setComentarios((prev) => [...prev, criado]);
        setNovoTexto("");
      }
    } finally {
      setEnviando(false);
    }
  };

  const handleExcluir = async (id) => {
    await apiClient.excluirComentarioAtividade(id);
    setComentarios((prev) => prev.filter((c) => c.id !== id));
    setComentarioParaExcluir(null);
  };

  const formatarHora = (isoDate) => {
    if (!isoDate) return "";
    try {
      const d = new Date(isoDate);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} às ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  return (
    <div
      className="rounded border p-2.5 flex flex-col gap-2 mt-2"
      style={{
        background: T.raised,
        borderColor: T.line,
        fontFamily: FONT,
      }}
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between text-xs font-bold" style={{ color: T.text }}>
        <span className="flex items-center gap-1.5" style={{ color: ORANGE }}>
          <MessageSquare size={13} />
          <span>Comentários da Atividade</span>
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
          style={{
            background: comentarios.length > 0 ? "rgba(254,80,0,0.15)" : "rgba(0,0,0,0.06)",
            color: comentarios.length > 0 ? ORANGE : T.dim,
          }}
        >
          {comentarios.length}
        </span>
      </div>

      {/* Lista de Comentários */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {carregando && comentarios.length === 0 ? (
          <div className="py-3 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Loader2 size={13} className="animate-spin" /> Carregando comentários...
          </div>
        ) : comentarios.length === 0 ? (
          <p className="text-[11px] text-gray-400 py-1 text-center italic">
            Nenhum comentário registrado ainda. Qualquer membro pode visualizar e registrar observações.
          </p>
        ) : (
          comentarios.map((c) => {
            const eMeu = user?.id && c.user_id === user.id;
            return (
              <div
                key={c.id}
                className="p-2 rounded text-xs flex flex-col gap-0.5"
                style={{
                  background: T.input,
                  border: `1px solid ${T.line}`,
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-[11px] truncate flex items-center gap-1" style={{ color: ORANGE }}>
                    <User size={10} />
                    {c.user_nome || "Usuário"}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9.5px] text-gray-400" style={{ ...NUM }}>
                      {formatarHora(c.created_at)}
                    </span>
                    {(eMeu || user?.role === "admin") && (
                      <button
                        onClick={() => setComentarioParaExcluir(c)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                        title="Excluir comentário"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11.5px] whitespace-pre-wrap break-words mt-0.5" style={{ color: T.text }}>
                  {c.texto}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Input de Novo Comentário */}
      <form onSubmit={handleEnviar} className="flex gap-1.5 mt-1">
        <input
          type="text"
          value={novoTexto}
          onChange={(e) => setNovoTexto(e.target.value)}
          placeholder="Escreva um comentário..."
          disabled={enviando}
          className="flex-1 text-xs px-2 py-1.5 outline-none rounded"
          style={{
            background: T.input,
            border: `1px solid ${T.line}`,
            color: T.text,
          }}
        />
        <button
          type="submit"
          disabled={enviando || !novoTexto.trim()}
          className="px-2.5 py-1.5 rounded font-bold text-white text-xs flex items-center justify-center transition-all hover:brightness-110 disabled:opacity-40 cursor-pointer"
          style={{ background: ORANGE }}
          title="Enviar comentário"
        >
          {enviando ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        </button>
      </form>

      {comentarioParaExcluir && (
        <ModalConfirmarExclusao
          T={T}
          titulo="Excluir Comentário"
          mensagem="Tem certeza que deseja excluir esta anotação da atividade?"
          itemNome={comentarioParaExcluir.texto?.length > 60 ? comentarioParaExcluir.texto.substring(0, 60) + "..." : comentarioParaExcluir.texto}
          textoBotao="Excluir"
          onConfirmar={() => handleExcluir(comentarioParaExcluir.id)}
          onCancelar={() => setComentarioParaExcluir(null)}
        />
      )}
    </div>
  );
}
