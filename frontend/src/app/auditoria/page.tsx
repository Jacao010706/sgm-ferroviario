"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

type Registro = {
  id: string;
  created_at: string;
  gmg_id: string;
  gmg_tag: string | null;
  gmg_nome: string;
  controller_type: string;
  usuario: string;
  comando: string;
  resultado: string;
  mensagem_erro: string | null;
  origem: string;
  registros_modbus: any;
};

// created_at vem em UTC sem sufixo de fuso; acrescenta o "Z" para o
// navegador converter corretamente para o horario local.
function paraLocal(iso: string) {
  const utc = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(utc).toLocaleString("pt-BR");
}

function corResultado(r: string) {
  if (r === "SUCESSO") return "#00cc44";
  if (r === "FALHA") return "#ff3333";
  return "#ffd700";
}

export default function AuditoriaPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [agrupado, setAgrupado] = useState(true);

  const [fTag, setFTag] = useState("");
  const [fUsuario, setFUsuario] = useState("");
  const [fInicio, setFInicio] = useState("");
  const [fFim, setFFim] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const params: any = { limit: 300 };
      if (fTag) params.gmg_tag = fTag;
      if (fUsuario) params.usuario = fUsuario;
      if (fInicio) params.data_inicio = new Date(fInicio).toISOString();
      if (fFim) params.data_fim = new Date(fFim).toISOString();
      const r = await api.get("/generators/audit-log", { params });
      setRegistros(r.data || []);
    } catch (e: any) {
      setErro(e?.response?.data?.detail || "Erro ao carregar auditoria.");
    } finally {
      setCarregando(false);
    }
  }, [fTag, fUsuario, fInicio, fFim]);

  useEffect(() => { carregar(); }, []);

  const tags = Array.from(new Set(registros.map((r) => r.gmg_tag).filter(Boolean))) as string[];

  // Agrupa por comando: mesma tag + usuario + comando dentro de 30s.
  // O registro exibido e o de maior peso (FLASK_LOCAL > FASTAPI sucesso/falha > tentativa).
  function agrupar(lista: Registro[]) {
    const grupos: { chave: string; itens: Registro[] }[] = [];
    for (const reg of lista) {
      const t = new Date(reg.created_at).getTime();
      const existente = grupos.find((g) => {
        const p = g.itens[0];
        return p.gmg_tag === reg.gmg_tag && p.usuario === reg.usuario &&
               p.comando === reg.comando &&
               Math.abs(new Date(p.created_at).getTime() - t) < 30000;
      });
      if (existente) existente.itens.push(reg);
      else grupos.push({ chave: reg.id, itens: [reg] });
    }
    return grupos;
  }

  const grupos = agrupar(registros);

  return (
    <div style={{ padding: 24, background: "#0a0a0a", minHeight: "100vh", color: "#ddd", fontFamily: "monospace" }}>
      <h1 style={{ color: "#00ff41", fontSize: 20, marginBottom: 4 }}>
        AUDITORIA DE COMANDOS REMOTOS
      </h1>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>
        Horarios convertidos para o fuso local. Cada comando gera ate 3 registros.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
        <label style={{ fontSize: 12 }}>
          <div style={{ color: "#888", marginBottom: 4 }}>GERADOR</div>
          <select value={fTag} onChange={(e) => setFTag(e.target.value)}
                  style={{ background: "#111", color: "#ddd", border: "1px solid #333", padding: 6, minWidth: 180 }}>
            <option value="">(todos)</option>
            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label style={{ fontSize: 12 }}>
          <div style={{ color: "#888", marginBottom: 4 }}>USUARIO</div>
          <input value={fUsuario} onChange={(e) => setFUsuario(e.target.value)} placeholder="e-mail ou parte"
                 style={{ background: "#111", color: "#ddd", border: "1px solid #333", padding: 6, minWidth: 200 }}/>
        </label>

        <label style={{ fontSize: 12 }}>
          <div style={{ color: "#888", marginBottom: 4 }}>DE</div>
          <input type="datetime-local" value={fInicio} onChange={(e) => setFInicio(e.target.value)}
                 style={{ background: "#111", color: "#ddd", border: "1px solid #333", padding: 6 }}/>
        </label>

        <label style={{ fontSize: 12 }}>
          <div style={{ color: "#888", marginBottom: 4 }}>ATE</div>
          <input type="datetime-local" value={fFim} onChange={(e) => setFFim(e.target.value)}
                 style={{ background: "#111", color: "#ddd", border: "1px solid #333", padding: 6 }}/>
        </label>

        <button onClick={carregar} disabled={carregando}
                style={{ background: "#003311", color: "#00ff41", border: "1px solid #00ff41", padding: "8px 16px", cursor: "pointer" }}>
          {carregando ? "..." : "FILTRAR"}
        </button>

        <button onClick={() => setAgrupado(!agrupado)}
                style={{ background: "#111", color: "#ffd700", border: "1px solid #ffd700", padding: "8px 16px", cursor: "pointer" }}>
          {agrupado ? "VER TUDO" : "AGRUPAR"}
        </button>
      </div>

      {erro && <div style={{ color: "#ff3333", marginBottom: 16 }}>{erro}</div>}

      <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
        {agrupado ? `${grupos.length} comando(s)` : `${registros.length} registro(s)`}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ color: "#888", textAlign: "left", borderBottom: "1px solid #333" }}>
            <th style={{ padding: 8 }}>DATA/HORA</th>
            <th style={{ padding: 8 }}>GERADOR</th>
            <th style={{ padding: 8 }}>USUARIO</th>
            <th style={{ padding: 8 }}>COMANDO</th>
            <th style={{ padding: 8 }}>RESULTADO</th>
            {!agrupado && <th style={{ padding: 8 }}>ORIGEM</th>}
            <th style={{ padding: 8 }}>DETALHE</th>
          </tr>
        </thead>
        <tbody>
          {agrupado
            ? grupos.map((g) => {
                const principal = g.itens.find((i) => i.origem === "FLASK_LOCAL")
                  || g.itens.find((i) => i.resultado !== "TENTATIVA")
                  || g.itens[0];
                const modbus = g.itens.find((i) => i.registros_modbus)?.registros_modbus;
                const erroMsg = g.itens.find((i) => i.mensagem_erro)?.mensagem_erro;
                return (
                  <tr key={g.chave} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ padding: 8 }}>{paraLocal(principal.created_at)}</td>
                    <td style={{ padding: 8 }}>{principal.gmg_tag}</td>
                    <td style={{ padding: 8 }}>{principal.usuario}</td>
                    <td style={{ padding: 8 }}>{principal.comando}</td>
                    <td style={{ padding: 8, color: corResultado(principal.resultado) }}>{principal.resultado}</td>
                    <td style={{ padding: 8, color: "#666", fontSize: 11 }}>
                      {erroMsg || (modbus ? JSON.stringify(modbus) : "")}
                    </td>
                  </tr>
                );
              })
            : registros.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td style={{ padding: 8 }}>{paraLocal(r.created_at)}</td>
                  <td style={{ padding: 8 }}>{r.gmg_tag}</td>
                  <td style={{ padding: 8 }}>{r.usuario}</td>
                  <td style={{ padding: 8 }}>{r.comando}</td>
                  <td style={{ padding: 8, color: corResultado(r.resultado) }}>{r.resultado}</td>
                  <td style={{ padding: 8, color: "#888" }}>{r.origem}</td>
                  <td style={{ padding: 8, color: "#666", fontSize: 11 }}>
                    {r.mensagem_erro || (r.registros_modbus ? JSON.stringify(r.registros_modbus) : "")}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>

      {!carregando && registros.length === 0 && !erro && (
        <div style={{ color: "#666", padding: 24, textAlign: "center" }}>
          Nenhum comando registrado no periodo.
        </div>
      )}
    </div>
  );
}
