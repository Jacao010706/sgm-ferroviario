"use client";

import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://laudable-peace-production-09cd.up.railway.app";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  VENCIDO:  { label: "Vencido",       bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500"    },
  PROXIMO:  { label: "Próx. 30 dias", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  OK:       { label: "Em dia",        bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  SEM_DATA: { label: "Sem data",      bg: "bg-gray-100",   text: "text-gray-500",   dot: "bg-gray-400"   },
};

const PERIODO_DIAS: Record<string, number> = {
  MENSAL: 30, BIMESTRAL: 61, TRIMESTRAL: 91,
  SEMESTRAL: 182, ANUAL: 365, BIENAL: 730,
};

interface Ativo {
  id: number;
  seq_planilha: number | null;
  num_ativo: string | null;
  local: string | null;
  sublocal: string | null;
  sistema: string | null;
  nome_ativo: string | null;
  tag: string | null;
  periodicidade: string | null;
  data_ult_manu: string | null;
  proxima_manu: string | null;
  status: string;
}

interface Resumo {
  total: number;
  vencidos: number;
  proximos_30d: number;
  ok: number;
  sem_data: number;
  eficiencia_pct: number;
  por_sistema: { sistema: string; total: number; vencidos: number }[];
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.SEM_DATA;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function Card({ label, valor, cor }: { label: string; valor: string | number; cor: string }) {
  const cores: Record<string, string> = {
    vermelho: "border-red-400 bg-red-50 text-red-700",
    amarelo:  "border-yellow-400 bg-yellow-50 text-yellow-700",
    verde:    "border-green-400 bg-green-50 text-green-700",
    cinza:    "border-gray-300 bg-gray-50 text-gray-500",
    azul:     "border-blue-400 bg-blue-50 text-blue-700",
  };
  return (
    <div className={`border-l-4 rounded-lg p-4 ${cores[cor]}`}>
      <p className="text-sm font-medium opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{valor}</p>
    </div>
  );
}

export default function SaeePage() {
  const [ativos, setAtivos]           = useState<Ativo[]>([]);
  const [resumo, setResumo]           = useState<Resumo | null>(null);
  const [filtros, setFiltros]         = useState<{ sistemas: string[]; sublocais: string[]; periodicidades: string[] }>({ sistemas: [], sublocais: [], periodicidades: [] });
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(false);
  const [modalAtivo, setModalAtivo]   = useState<Ativo | null>(null);
  const [dataRealizada, setDataRealizada] = useState(new Date().toISOString().split("T")[0]);
  const [obsManutencao, setObsManutencao] = useState("");
  const [salvando, setSalvando]       = useState(false);

  // Filtros
  const [sistema, setSistema]         = useState("");
  const [sublocal, setSublocal]       = useState("");
  const [periodicidade, setPeriodicidade] = useState("");
  const [statusFiltro, setStatusFiltro]   = useState("");
  const [busca, setBusca]             = useState("");
  const [page, setPage]               = useState(1);

  const carregarResumo = () => {
    fetch(`${API}/saee-ativos/resumo`).then(r => r.json()).then(setResumo).catch(console.error);
  };

  useEffect(() => {
    fetch(`${API}/saee-ativos/filtros`).then(r => r.json()).then(setFiltros).catch(console.error);
    carregarResumo();
  }, []);

  const carregarAtivos = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), page_size: "50" });
    if (sistema)       p.set("sistema", sistema);
    if (sublocal)      p.set("sublocal", sublocal);
    if (periodicidade) p.set("periodicidade", periodicidade);
    if (statusFiltro)  p.set("status", statusFiltro);
    if (busca)         p.set("busca", busca);
    fetch(`${API}/saee-ativos?${p}`)
      .then(r => r.json())
      .then(d => { setAtivos(d.items || []); setTotal(d.total || 0); setTotalPages(d.total_pages || 1); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sistema, sublocal, periodicidade, statusFiltro, busca, page]);

  useEffect(() => { carregarAtivos(); }, [carregarAtivos]);
  useEffect(() => { setPage(1); }, [sistema, sublocal, periodicidade, statusFiltro, busca]);

  const registrarManutencao = async () => {
    if (!modalAtivo) return;
    setSalvando(true);
    try {
      await fetch(`${API}/saee-ativos/${modalAtivo.id}/manutencao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data_realizacao: dataRealizada, observacao: obsManutencao }),
      });
      setModalAtivo(null);
      setObsManutencao("");
      carregarAtivos();
      carregarResumo();
    } catch (e) {
      alert("Erro ao registrar manutenção");
    } finally {
      setSalvando(false);
    }
  };

  const fmt = (d: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "–";

  const proximaPreview = () => {
    if (!modalAtivo?.periodicidade || !dataRealizada) return null;
    const dias = PERIODO_DIAS[modalAtivo.periodicidade];
    if (!dias) return null;
    const d = new Date(dataRealizada + "T00:00:00");
    d.setDate(d.getDate() + dias);
    return d.toLocaleDateString("pt-BR");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800">⚡ Ativos SAEE</h1>
        <p className="text-sm text-gray-500">Plano de Manutenção SENERG — {total.toLocaleString("pt-BR")} ativos</p>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">

        {/* Cards */}
        {resumo && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card label="Total de Ativos"  valor={resumo.total}               cor="azul"     />
            <Card label="Vencidos"          valor={resumo.vencidos}            cor="vermelho" />
            <Card label="Próximos 30 dias" valor={resumo.proximos_30d}        cor="amarelo"  />
            <Card label="Em dia"            valor={resumo.ok}                  cor="verde"    />
            <Card label="Eficiência"        valor={`${resumo.eficiencia_pct}%`} cor="azul"   />
          </div>
        )}

        {/* Por sistema */}
        {resumo?.por_sistema && resumo.por_sistema.length > 0 && (
          <div className="bg-white rounded-xl border p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">Status por Sistema</h2>
            <div className="space-y-2">
              {resumo.por_sistema.map(s => {
                const pct = s.total > 0 ? Math.round((s.total - s.vencidos) / s.total * 100) : 0;
                return (
                  <div key={s.sistema} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-64 truncate">{s.sistema || "Não informado"}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-24 text-right">{s.vencidos} venc. / {s.total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl border p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <input type="text" placeholder="Buscar nome, TAG, nº ativo..." value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <select value={sistema} onChange={e => setSistema(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Todos os sistemas</option>
              {filtros.sistemas.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={sublocal} onChange={e => setSublocal(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Todos os locais</option>
              {filtros.sublocais.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={periodicidade} onChange={e => setPeriodicidade(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Todas periodicidades</option>
              {filtros.periodicidades.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Todos os status</option>
              <option value="VENCIDO">Vencidos</option>
              <option value="PROXIMO">Próximos 30 dias</option>
              <option value="OK">Em dia</option>
              <option value="SEM_DATA">Sem data</option>
            </select>
          </div>
          <div className="flex justify-between mt-3">
            <span className="text-xs text-gray-500">{loading ? "Carregando..." : `${total.toLocaleString("pt-BR")} ativos encontrados`}</span>
            <button onClick={() => { setSistema(""); setSublocal(""); setPeriodicidade(""); setStatusFiltro(""); setBusca(""); }}
              className="text-xs text-blue-500 hover:underline">Limpar filtros</button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Nº", "Ativo", "Local", "Sistema", "TAG", "Período", "Últ. Manu.", "Próx. Manu.", "Status", "Ação"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan={10} className="text-center py-12 text-gray-400">Carregando...</td></tr>}
                {!loading && ativos.length === 0 && <tr><td colSpan={10} className="text-center py-12 text-gray-400">Nenhum ativo encontrado</td></tr>}
                {!loading && ativos.map(a => (
                  <tr key={a.id} className={`hover:bg-gray-50 ${a.status === "VENCIDO" ? "bg-red-50/40" : a.status === "PROXIMO" ? "bg-yellow-50/40" : ""}`}>
                    <td className="px-4 py-3 text-gray-400 text-xs">{a.num_ativo || a.seq_planilha || "–"}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-xs"><span title={a.nome_ativo || ""}>{a.nome_ativo || "–"}</span></td>
                    <td className="px-4 py-3 text-gray-600"><div>{a.sublocal || "–"}</div><div className="text-xs text-gray-400">{a.local}</div></td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px]"><span title={a.sistema || ""}>{a.sistema || "–"}</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.tag || "–"}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{a.periodicidade || "–"}</span></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{fmt(a.data_ult_manu)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-medium">{fmt(a.proxima_manu)}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setModalAtivo(a); setDataRealizada(new Date().toISOString().split("T")[0]); }}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg">Dar baixa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-xs text-gray-500">Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-100">← Anterior</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-100">Próxima →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalAtivo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">Registrar Manutenção</h2>
              <p className="text-sm text-gray-500 mt-1 truncate">{modalAtivo.nome_ativo}</p>
              <p className="text-xs text-gray-400">{modalAtivo.sublocal} · {modalAtivo.tag} · {modalAtivo.periodicidade}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de realização</label>
                <input type="date" value={dataRealizada} onChange={e => setDataRealizada(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
                <textarea value={obsManutencao} onChange={e => setObsManutencao(e.target.value)} rows={3}
                  placeholder="Anomalias, peças substituídas, técnicos..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>
              {proximaPreview() && (
                <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
                  Próxima manutenção: <strong>{proximaPreview()}</strong>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button onClick={() => setModalAtivo(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={registrarManutencao} disabled={salvando}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 font-medium">
                {salvando ? "Salvando..." : "Confirmar manutenção"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
