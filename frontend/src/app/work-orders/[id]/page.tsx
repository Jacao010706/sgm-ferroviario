"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { ArrowLeft, Save, CheckCircle, Camera, Trash2, Plus, X, ClipboardList, Package, Download, Printer, Fuel, Building2, User, ChevronDown } from "lucide-react";
import clsx from "clsx";

const PRIORITY_BADGE: Record<string, string> = { critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-amber-100 text-amber-700", low: "bg-green-100 text-green-700" };
const PRIORITY_LABEL: Record<string, string> = { critical: "Critica", high: "Alta", medium: "Media", low: "Baixa" };
const STATUS_BADGE: Record<string, string> = { pending: "bg-slate-100 text-slate-600", assigned: "bg-blue-100 text-blue-700", in_progress: "bg-indigo-100 text-indigo-700", paused: "bg-yellow-100 text-yellow-700", waiting_parts: "bg-orange-100 text-orange-700", waiting_approval: "bg-purple-100 text-purple-700", completed: "bg-green-100 text-green-700", cancelled: "bg-slate-100 text-slate-400" };
const STATUS_LABEL: Record<string, string> = { pending: "Pendente", assigned: "Atribuida", in_progress: "Em Execucao", paused: "Pausada", waiting_parts: "Ag. Pecas", completed: "Concluida", cancelled: "Cancelada", waiting_approval: "Ag. Aprovacao" };
const MAINTENANCE_LABEL: Record<string, string> = { preventive: "Preventiva", corrective: "Corretiva", emergency: "Emergencial", predictive: "Preditiva", inspection: "Inspecao", calibration: "Calibracao" };

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "block text-sm font-medium text-slate-700 mb-1";

interface ChecklistItem { id: string; text: string; done: boolean; completed?: string; autoMode?: string; showStatus?: boolean; }
interface ContractedCompany { id: number; name: string; cnpj?: string; }
interface Material { id: string; name: string; quantity: string; unit: string; }

const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildOSHtml(order: any, asset: any, subAsset: any, form: any, checklist: ChecklistItem[], materials: Material[]) {
  const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const checklistDone = checklist.filter(i => i.done).length;
  const periodicidade = order.maintenance_type === "preventive" ? (
    order.title?.toLowerCase().includes("mensal") ? "Mensal" :
    order.title?.toLowerCase().includes("semestral") ? "Semestral" :
    order.title?.toLowerCase().includes("anual") ? "Anual" :
    order.title?.toLowerCase().includes("bienal") ? "Bienal" : "Preventiva"
  ) : (MAINTENANCE_LABEL[order.maintenance_type] || order.maintenance_type);

  const turno = form.actual_start ? (new Date(form.actual_start).getHours() < 12 ? "MANHA" : new Date(form.actual_start).getHours() < 18 ? "TARDE" : "NOITE") : "";
  const dataExec = form.actual_start ? new Date(form.actual_start).toLocaleDateString("pt-BR") : "";
  const horaIni = form.actual_start ? new Date(form.actual_start).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"}) : "";
  const horaFim = form.actual_end ? new Date(form.actual_end).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"}) : "";
  const equipamento = (asset ? `${esc(asset.name)} (${esc(asset.tag)})` : "") + (subAsset ? ` &gt; ${esc(subAsset.name)}` : "");
  const itemConcluido = checklist.find(i => i.completed);
  const itemModoAuto = checklist.find(i => i.autoMode);
  const concluidoLabel = itemConcluido?.completed || (form.status === "completed" ? "Sim" : "");
  const modoAutoLabel = itemModoAuto?.autoMode || "";

  let checklistHtml = "";
  const checklistDoneItems = checklist.filter(i => i.done);
  if (checklistDoneItems.length > 0) {
    const rows = [];
    for (let i = 0; i < checklistDoneItems.length; i += 2) {
      const a = checklistDoneItems[i];
      const b = checklistDoneItems[i + 1];
      rows.push(`<tr>
        <td style="text-align:center;width:4%;font-weight:bold">&#10003;</td>
        <td style="width:46%;font-weight:bold">${esc(a?.text)}</td>
        <td style="text-align:center;width:4%;font-weight:bold">${b ? "&#10003;" : ""}</td>
        <td style="width:46%;font-weight:bold">${esc(b?.text || "")}</td>
      </tr>`);
    }
    checklistHtml = `
      <table class="tt">
        <tr><th colspan="4">CHECKLIST DE ATIVIDADES REALIZADAS (${checklistDoneItems.length}/${checklist.length})</th></tr>
        <tr><th style="width:4%">OK</th><th style="width:46%">Atividade</th><th style="width:4%">OK</th><th style="width:46%">Atividade</th></tr>
        ${rows.join("")}
      </table>`;
  }

  let materialsHtml = "";
  if (materials.length > 0) {
    const rows = materials.map((m, i) => `<tr>
      <td style="text-align:center;width:5%">${i + 1}</td>
      <td style="width:55%">${esc(m.name)}</td>
      <td style="text-align:center;width:20%">${esc(m.quantity)}</td>
      <td style="text-align:center;width:20%">${esc(m.unit)}</td>
    </tr>`).join("");
    materialsHtml = `
      <table class="tt">
        <tr><th colspan="4">MATERIAIS UTILIZADOS</th></tr>
        <tr><th style="width:5%">#</th><th style="width:55%">Material / Peca</th><th style="width:20%">Qtd</th><th style="width:20%">Unidade</th></tr>
        ${rows}
      </table>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>OS ${esc(order.number)}</title>
<style>
  @page { margin: 10mm; size: A4; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #000; line-height: 1.25; }
  table.tt { width: 100%; border-collapse: collapse; margin-bottom: 4px; table-layout: fixed; }
  table.tt td, table.tt th { border: 1px solid #000; padding: 3px 5px; font-size: 9px; vertical-align: top; word-wrap: break-word; }
  table.tt th { background: #d9d9d9; font-weight: bold; text-align: center; }
  .header-empresa { text-align: center; font-weight: bold; font-size: 12px; border: 1px solid #000; padding: 4px; }
  .header-senerg { font-weight: bold; font-size: 10px; border: 1px solid #000; border-top: none; padding: 3px 5px; display: flex; justify-content: space-between; }
  .section-title { background: #d9d9d9; font-weight: bold; font-size: 9px; border: 1px solid #000; padding: 3px 5px; text-transform: uppercase; }
  .footer-note { text-align: right; font-size: 8px; color: #666; margin-top: 6px; }
</style>
</head>
<body>
  <div class="header-empresa">EMPRESA DE TRENS URBANOS DE PORTO ALEGRE S.A</div>
  <div class="header-senerg">
    <span>SENERG &ndash; ENERGIA</span>
    <span>OS N&ordm;: <strong>${esc(order.number)}</strong></span>
  </div>

  <table class="tt" style="margin-top:0">
    <tr>
      <td style="width:16%"><strong>OS N&ordm;:</strong><br/>${esc(order.number)}</td>
      <td style="width:18%"><strong>LOCAL:</strong><br/>Sala do GGD</td>
      <td style="width:10%"><strong>SEMANA:</strong><br/>&nbsp;</td>
      <td style="width:10%"><strong>TURNO:</strong><br/>${turno}</td>
      <td style="width:46%">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="border:none;padding:1px 0;width:75%"><strong>Fiscal Trensurb (1):</strong> <span style="font-size:11px">${esc(form.fiscal_1 || "")}</span></td><td style="border:none;padding:1px 0;width:25%"><strong>RE:</strong></td></tr>
          <tr><td style="border:none;padding:1px 0"><strong>Fiscal Trensurb (2):</strong> <span style="font-size:11px">${esc(form.fiscal_2 || "")}</span></td><td style="border:none;padding:1px 0"><strong>RE:</strong></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td colspan="2"><strong>DATA DA EXECUCAO:</strong> ${dataExec}</td>
      <td colspan="3"><strong>EMPRESA CONTRATADA:</strong> <span style="font-size:12px;font-weight:bold">${esc(form.contractor_name || "")}</span></td>
    </tr>
  </table>

  <table class="tt">
    <tr>
      <th style="width:35%">Descricao</th>
      <th style="width:14%">Periodicidade</th>
      <th style="width:21%">Equipamento</th>
      <th style="width:10%">Horario inicial</th>
      <th style="width:10%">Horario final</th>
      <th style="width:5%">Concluido?</th>
      <th style="width:5%">Modo auto?</th>
    </tr>
    <tr>
      <td>${esc(order.title)}</td>
      <td style="text-align:center">${esc(periodicidade)}</td>
      <td>${equipamento}</td>
      <td style="text-align:center">${horaIni}</td>
      <td style="text-align:center">${horaFim}</td>
      <td style="text-align:center">${concluidoLabel}</td>
      <td style="text-align:center">${modoAutoLabel || "&nbsp;"}</td>
    </tr>
  </table>

  <table class="tt">
    <tr><td colspan="2" class="section-title">Descricao das atividades, relacao de materiais, observacoes e inconformidades:</td></tr>
    <tr>
      <td style="width:50%;vertical-align:top"><strong>MANHA:</strong><div style="min-height:60px;padding-top:3px">${esc(form.observations || "")}</div></td>
      <td style="width:50%;vertical-align:top"><strong>TARDE:</strong><div style="min-height:60px">&nbsp;</div></td>
    </tr>
  </table>

  ${checklistHtml}
  ${materialsHtml}

  <table class="tt">
    <tr><td colspan="4" class="section-title">CONDICOES DE SEGURANCA: REALIZAR A APR ANTES DO INICIO DAS ATIVIDADES</td></tr>
    <tr><td style="width:25%"><strong>EMPREGADOS</strong></td><td style="width:10%"><strong>RE</strong></td><td style="width:25%"><strong>EMPREGADOS</strong></td><td style="width:10%"><strong>RE</strong></td></tr>
    <tr><td style="height:16px">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
    <tr><td style="height:16px">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  </table>

  <table class="tt">
    <tr>
      <td style="width:33%"><strong>Programada por:</strong><br/><div style="min-height:16px">&nbsp;</div><div style="display:flex;gap:8px;font-size:11px"><span>RE:</span><span>Assinatura:</span></div></td>
      <td style="width:34%"><strong>Preposto da CONTRATADA ${esc(form.contractor_name || "")}:</strong><br/><div style="min-height:16px;font-size:12px;font-weight:bold;text-align:center">${esc(form.contractor_preposto || "")}</div></td>
      <td style="width:33%"><strong>Fiscal Trensurb (M):</strong><br/><div style="min-height:16px;font-size:12px;font-weight:bold">${esc(form.fiscal_1 || "")}</div><strong>Fiscal Trensurb (T):</strong><br/><div style="min-height:16px;font-size:12px;font-weight:bold">${esc(form.fiscal_2 || "")}</div></td>
    </tr>
  </table>

  <table class="tt">
    <tr><td class="section-title">OBSERVACOES DA GESTAO / SUPERVISAO</td></tr>
    <tr><td style="min-height:60px;height:60px">${esc(form.observations || "")}&nbsp;</td></tr>
  </table>

  <table class="tt">
    <tr><th colspan="4">RESPONSAVEL PELAS OBSERVACOES</th></tr>
    <tr><th style="width:40%">Nome</th><th style="width:15%">RE</th><th style="width:20%">Data</th><th style="width:25%">Assinatura</th></tr>
    <tr><td style="height:20px">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  </table>

  <div class="footer-note">SGM Ferroviario &ndash; Emitido em: ${now} | OS: ${esc(order.number)}</div>
</body>
</html>`;
}

function buildAPRHtml(order: any, asset: any, form: any, aprSelections: Record<string, boolean>) {
  const epis = ["Capacete de seguranca","Protetor facial verde","Oculos de protecao","Protetor auditivo","Respirador","Perneira","Tapete isolante","Vara de manobra","Detector de tensao","Aterramento temporario","Fitas/cones","Radio comunicador"];
  const riscoSections = [
    {titulo:"Riscos Eletricos", itens:["Contato com partes energizadas","Arco eletrico / flash eletrico","Inducao eletromagnetica","Eletricidade estatica"]},
    {titulo:"Riscos de Queda", itens:["Queda de mesmo nivel","Queda de nivel diferente","Queda de objetos/ferramentas"]},
    {titulo:"Riscos de Incendio/Explosao", itens:["Presenca de gases inflamaveis","Curto circuito / faiscas","Materiais combustiveis no local"]},
    {titulo:"Riscos Mecanicos", itens:["Contato com partes moveis de maquinas","Ferramentas inadequadas ou defeituosas","Projecao de particulas/fragmentos"]},
    {titulo:"Riscos Ergonomicos", itens:["Postura inadequada em estruturas","Trabalhos agaixados em paineis","Levantamento e transporte manual de cargas (23kg)"]},
    {titulo:"Riscos a Terceiros", itens:["Energizacao acidental","Colisao de veiculos"]},
  ];

  const selectedEpis = epis.filter(e => aprSelections[`epi_${e}`]);
  const allRiscos = riscoSections.flatMap(s => s.itens);
  const selectedRiscos = allRiscos.filter(r => aprSelections[`risco_${r}`]);

  const turno = form.actual_start ? (new Date(form.actual_start).getHours() < 12 ? "Manha" : new Date(form.actual_start).getHours() < 18 ? "Tarde" : "Noite") : "";
  const dataApr = form.actual_start ? new Date(form.actual_start).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR");

  let episHtml = "";
  if (selectedEpis.length > 0) {
    const rows = [];
    for (let i = 0; i < selectedEpis.length; i += 2) {
      rows.push(`<tr>
        <td style="text-align:center;width:5%">X</td><td style="width:45%">${esc(selectedEpis[i])}</td>
        <td style="text-align:center;width:5%">${selectedEpis[i+1] ? "X" : ""}</td><td style="width:45%">${esc(selectedEpis[i+1] || "")}</td>
      </tr>`);
    }
    episHtml = `<table class="tt"><tr><td colspan="4" class="section-title">Equipamentos de seguranca a serem utilizados</td></tr>${rows.join("")}</table>`;
  }

  let riscosHtml = "";
  if (selectedRiscos.length > 0) {
    const rows = selectedRiscos.map(r => `<tr><td style="text-align:center;width:5%">X</td><td>${esc(r)}</td></tr>`).join("");
    riscosHtml = `<table class="tt"><tr><td colspan="2" class="section-title">Riscos Identificados</td></tr>${rows}</table>`;
  }

  const planejamento = [["a)","A equipe conferiu o servico a ser executado e esta apta a realizar as tarefas?"],["b)","Todos estao cientes do procedimento de trabalho para a atividade?"],["c)","O CCO foi informado da presenca da equipe na instalacao?"]]
    .map(([letra, txt]) => `<tr><td style="width:85%"><strong>${letra}</strong> ${txt}</td><td style="text-align:center;width:15%">[ ] Sim [ ] Nao</td></tr>`).join("");

  const outrosReq = ["Todo pessoal envolvido na atividade esta sem adornos (relogio, cracha, anel/alianca, etc.) ?","A equipe conferiu o servico a ser executado ? (Revisar)","A APR foi discutida e entendida por todos ?","Todos estao cientes que so deverao iniciar os servicos apos autorizacao ?"]
    .map((txt, i) => `<tr><td style="width:85%"><strong>${i+1}</strong> ${txt}</td><td style="text-align:center;width:15%">[ ] Sim [ ] Nao</td></tr>`).join("");

  const termino = ["Foram retirados os aterramentos temporarios ?","Foram retirados os cartoes de seguranca e os bloqueios das seccionadoras/disjuntores ?","Foi retirado todo pessoal e ferramental da area a ser reenergizada ?","Foi preenchido o Livro de Registros de Acesso (SEs e CBs) ?"]
    .map((txt, i) => `<tr><td style="width:85%"><strong>${i+1}</strong> ${txt}</td><td style="text-align:center;width:15%">[ ] Sim [ ] Nao</td></tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>APR ${esc(order.number)}</title>
<style>
  @page { margin: 10mm; size: A4; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #000; line-height: 1.25; }
  table.tt { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  table.tt td, table.tt th { border: 1px solid #000; padding: 3px 5px; font-size: 9px; vertical-align: top; }
  table.tt th { background: #d9d9d9; font-weight: bold; text-align: left; }
  .section-title { background: #d9d9d9; font-weight: bold; }
  .footer-note { text-align: right; font-size: 8px; color: #666; margin-top: 6px; }
</style>
</head>
<body>
  <table class="tt">
    <tr><td colspan="3" style="text-align:center;font-weight:bold;font-size:11px">SENERG - Setor de Energia<br/><span style="font-size:9px;font-weight:normal">Check-List de Seguranca do Trabalho - Manutencao dos Sistemas de Abastecimento de Energia Eletrica</span></td></tr>
    <tr>
      <td style="width:40%"><strong>Numero (OS/PI):</strong> ${esc(order.number)}</td>
      <td style="width:35%"><strong>Data:</strong> ${dataApr}</td>
      <td style="width:25%"><strong>Turno:</strong> ${turno}</td>
    </tr>
    <tr><td colspan="2"><strong>Supervisor do CCO:</strong></td><td><strong>Ha outras equipes?</strong> [ ] Sim [ ] Nao</td></tr>
    <tr><td colspan="3"><strong>Empresa Contratada:</strong> ${esc(form.contractor_name || "")} ${form.contractor_preposto ? `- Preposto: ${esc(form.contractor_preposto)}` : ""}</td></tr>
  </table>

  <table class="tt">
    <tr><td class="section-title">Descricao dos servicos a serem executados</td></tr>
    <tr><td style="height:30px">${esc(order.title)}${asset ? ` - ${esc(asset.name)} (${esc(asset.tag)})` : ""}</td></tr>
  </table>

  ${episHtml}
  ${riscosHtml}

  <table class="tt"><tr><td colspan="2" class="section-title">Planejamento</td></tr>${planejamento}</table>
  <table class="tt"><tr><td colspan="2" class="section-title">Outros requisitos</td></tr>${outrosReq}</table>
  <table class="tt"><tr><td colspan="2" class="section-title">Termino da manutencao (ANTES DA OPERACAO DE REENERGIZACAO)</td></tr>${termino}</table>

  <table class="tt">
    <tr><td colspan="3" class="section-title">Pessoal autorizado e ciente desta Permissao de Trabalho</td></tr>
    <tr><th style="width:50%">Nome</th><th style="width:15%">RE</th><th style="width:35%">Visto</th></tr>
    <tr style="height:18px"><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
    <tr style="height:18px"><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  </table>

  <table class="tt">
    <tr>
      <td style="width:50%"><strong>Visto do Responsavel pela atividade:</strong><div style="min-height:18px">&nbsp;</div></td>
      <td style="width:50%"><strong>Justificativa:</strong><div style="min-height:18px">&nbsp;</div></td>
    </tr>
  </table>

  <div class="footer-note">SGM Ferroviario &ndash; APR/PT &ndash; OS: ${esc(order.number)} &ndash; Emitido em: ${new Date().toLocaleDateString("pt-BR")}</div>
</body>
</html>`;
}

function openPrintWindow(html: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    alert("O navegador bloqueou a janela de impressao. Permita pop-ups para este site.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    w.focus();
    w.print();
  };
}

function MiniSimNaoToggle({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-20 shrink-0">{label}</span>
      <button
        type="button"
        onClick={() => onChange(value === "Sim" ? "" : "Sim")}
        className={clsx(
          "flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-all",
          value === "Sim" ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
        )}
      >
        {value === "Sim" && <CheckCircle size={11} />} Sim
      </button>
      <button
        type="button"
        onClick={() => onChange(value === "Nao" ? "" : "Nao")}
        className={clsx(
          "flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-all",
          value === "Nao" ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
        )}
      >
        {value === "Nao" && <CheckCircle size={11} />} Nao
      </button>
    </div>
  );
}

function MiniStatusToggle({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const options: { key: string; label: string; activeClass: string }[] = [
    { key: "Sim", label: "Sim", activeClass: "border-green-500 bg-green-50 text-green-700" },
    { key: "Parcial", label: "Parcial", activeClass: "border-amber-400 bg-amber-50 text-amber-700" },
    { key: "Nao Concluido", label: "Nao Concluido", activeClass: "border-red-400 bg-red-50 text-red-700" },
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-20 shrink-0">Concluido?</span>
      <div className="flex gap-1.5 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(value === opt.key ? "" : opt.key)}
            className={clsx(
              "flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-all",
              value === opt.key ? opt.activeClass : "border-slate-200 text-slate-500 hover:bg-slate-50"
            )}
          >
            {value === opt.key && <CheckCircle size={11} />} {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [asset, setAsset] = useState<any>(null);
  const [subAsset, setSubAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<any>({});
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newTask, setNewTask] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [newMaterial, setNewMaterial] = useState({ name: "", quantity: "1", unit: "un" });
  const [partSearch, setPartSearch] = useState("");
  const [allParts, setAllParts] = useState<any[]>([]);
  const [partResults, setPartResults] = useState<any[]>([]);
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAPR, setShowAPR] = useState(false);
  const [aprSelections, setAprSelections] = useState<Record<string, boolean>>({});
  const toggleAPR = (key: string) => setAprSelections(prev => ({ ...prev, [key]: !prev[key] }));
  const [companies, setCompanies] = useState<ContractedCompany[]>([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCnpj, setNewCompanyCnpj] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [importMode, setImportMode] = useState<"replace" | "append">("append");
  const [fiscalSuggestions, setFiscalSuggestions] = useState<{ name: string }[]>([]);
  const [fiscalDropdownOpen, setFiscalDropdownOpen] = useState<1 | 2 | null>(null);
  const [companyPrepostos, setCompanyPrepostos] = useState<{ id: number; company_id: number; name: string }[]>([]);
  const [prepostoDropdownOpen, setPrepostoDropdownOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get("/work-orders/" + id),
      api.get("/assets/", { params: { limit: 100 } }),
    ]).then(([r, assetsRes]) => {
      const o = r.data;
      setOrder(o);
      setForm({
        status: o.status || "pending",
        priority: o.priority || "medium",
        internal_hours: o.internal_hours ?? "",
        contractor_hours: o.contractor_hours ?? "",
        contractor_name: o.contractor_name || "",
        contractor_document: o.contractor_document || "",
        contractor_preposto: o.contractor_preposto || "",
        fiscal_1: o.fiscal_1 || "",
        fiscal_2: o.fiscal_2 || "",
        scheduled_start: o.scheduled_start ? o.scheduled_start.slice(0, 16) : "",
        scheduled_end: o.scheduled_end ? o.scheduled_end.slice(0, 16) : "",
        actual_start: o.actual_start ? o.actual_start.slice(0, 16) : "",
        actual_end: o.actual_end ? o.actual_end.slice(0, 16) : "",
        observations: o.observations || "",
        root_cause: o.root_cause || "",
        corrective_action: o.corrective_action || "",
        fuel_liters_added: o.fuel_liters_added ?? "",
      });
      if (o.checklist_progress && typeof o.checklist_progress === "object") {
        const items = Object.entries(o.checklist_progress).map(([key, val]: any) => ({ id: key, text: val.text || key, done: val.done || false, completed: val.completed || "", autoMode: val.autoMode || "", showStatus: val.showStatus || false }));
        setChecklist(items);
      }
      if (o.parts_used && Array.isArray(o.parts_used)) {
        setMaterials(o.parts_used.map((p: any, i: number) => ({ id: p.id || `mat_${i}`, name: p.name || p, quantity: p.quantity || "1", unit: p.unit || "un" })));
      }
      const allAssets = assetsRes.data;
      const found = allAssets.find((a: any) => a.id === o.asset_id);
      if (found) setAsset(found);
      if (o.sub_asset_id) { const sub = allAssets.find((a: any) => a.id === o.sub_asset_id); if (sub) setSubAsset(sub); }
    }).catch(console.error).finally(() => setLoading(false));
    api.get("/contracted-companies/").then(r => setCompanies(r.data)).catch(() => {});
    api.get("/parts/", { params: { limit: 500 } }).then(r => setAllParts(Array.isArray(r.data) ? r.data : r.data.items || [])).catch(() => {});
    api.get("/fiscal-names/").then(r => setFiscalSuggestions(r.data)).catch(() => {});
  }, [id]);

  // Carrega os prepostos da empresa selecionada sempre que contractor_name mudar
  useEffect(() => {
    const company = companies.find(c => c.name === form.contractor_name);
    if (!company) { setCompanyPrepostos([]); return; }
    api.get("/company-prepostos/", { params: { company_id: company.id } })
      .then(r => setCompanyPrepostos(r.data))
      .catch(() => setCompanyPrepostos([]));
  }, [form.contractor_name, companies]);

  const registerFiscalUse = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    api.post("/fiscal-names/use", { name: trimmed })
      .then(() => api.get("/fiscal-names/").then(r => setFiscalSuggestions(r.data)))
      .catch(() => {});
  };

  const registerPrepostoUse = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const company = companies.find(c => c.name === form.contractor_name);
    if (!company) return;
    const exists = companyPrepostos.some(p => p.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;
    api.post("/company-prepostos/", { company_id: company.id, name: trimmed })
      .then(r => setCompanyPrepostos(prev => [...prev, r.data]))
      .catch(() => {});
  };

  const handlePrint = () => {
    if (!order) return;
    const html = buildOSHtml(order, asset, subAsset, form, checklist, materials);
    openPrintWindow(html);
  };

  const handlePrintAPR = () => {
    if (!order) return;
    const html = buildAPRHtml(order, asset, form, aprSelections);
    openPrintWindow(html);
  };

  const openImportModal = () => {
    setShowImportModal(true); setSelectedTemplate(""); setLoadingTemplates(true);
    api.get("/checklists/").then((r) => setTemplates(r.data)).catch(() => setTemplates([])).finally(() => setLoadingTemplates(false));
  };

  const handleImport = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;
    const newItems: ChecklistItem[] = template.items.map((item: any) => ({ id: Date.now().toString() + Math.random().toString(36).slice(2), text: item.text || item, done: false }));
    if (importMode === "replace") setChecklist(newItems); else setChecklist(prev => [...prev, ...newItems]);
    setShowImportModal(false);
    setMsg(`Checklist "${template.name}" importado!`);
    setTimeout(() => setMsg(""), 3000);
  };

  const buildChecklistPayload = (items: ChecklistItem[]) => {
    const obj: Record<string, any> = {};
    items.forEach(item => { obj[item.id] = { text: item.text, done: item.done, completed: item.completed || "", autoMode: item.autoMode || "", showStatus: item.showStatus || false }; });
    return obj;
  };

  const handleSave = async () => {
    setSaving(true); setMsg("");
    try {
      const payload: any = { ...form };
      if (payload.internal_hours !== "") payload.internal_hours = parseFloat(payload.internal_hours); else delete payload.internal_hours;
      if (payload.contractor_hours !== "") payload.contractor_hours = parseFloat(payload.contractor_hours); else delete payload.contractor_hours;
      if (payload.fuel_liters_added !== "") payload.fuel_liters_added = parseFloat(payload.fuel_liters_added); else delete payload.fuel_liters_added;
      if (!payload.scheduled_start) delete payload.scheduled_start;
      if (!payload.scheduled_end) delete payload.scheduled_end;
      if (!payload.actual_start) delete payload.actual_start;
      if (!payload.actual_end) delete payload.actual_end;
      if (!payload.contractor_name) delete payload.contractor_name;
      if (!payload.contractor_document) delete payload.contractor_document;
      if (!payload.contractor_preposto) delete payload.contractor_preposto;
      if (!payload.observations) delete payload.observations;
      if (!payload.root_cause) delete payload.root_cause;
      if (!payload.corrective_action) delete payload.corrective_action;
      payload.checklist_progress = buildChecklistPayload(checklist);
      payload.parts_used = materials.map(m => ({ id: m.id, name: m.name, quantity: m.quantity, unit: m.unit }));
      await api.patch("/work-orders/" + id, payload);
      setMsg("Salvo com sucesso!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e: any) { setMsg(e?.response?.data?.detail || "Erro ao salvar"); } finally { setSaving(false); }
  };

  const handleComplete = async () => {
    if (!confirm("Confirmar conclusao da OS?")) return;
    setSaving(true); setMsg("");
    try {
      const payload: any = { ...form, status: "completed", actual_end: new Date().toISOString() };
      if (payload.internal_hours !== "") payload.internal_hours = parseFloat(payload.internal_hours); else delete payload.internal_hours;
      if (payload.contractor_hours !== "") payload.contractor_hours = parseFloat(payload.contractor_hours); else delete payload.contractor_hours;
      if (payload.fuel_liters_added !== "") payload.fuel_liters_added = parseFloat(payload.fuel_liters_added); else delete payload.fuel_liters_added;
      payload.checklist_progress = buildChecklistPayload(checklist);
      payload.parts_used = materials.map(m => ({ id: m.id, name: m.name, quantity: m.quantity, unit: m.unit }));
      await api.patch("/work-orders/" + id, payload);
      setMsg("OS concluida!");
      setTimeout(() => router.back(), 2000);
    } catch (e: any) { setMsg(e?.response?.data?.detail || "Erro ao concluir"); } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData(); formData.append("file", file);
      const res = await api.post("/work-orders/" + id + "/photos", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setOrder((prev: any) => ({ ...prev, photos: res.data.photos }));
      setMsg("Foto enviada!"); setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Erro ao enviar foto"); } finally { setUploading(false); }
  };

  const handlePhotoDelete = async (publicId: string) => {
    if (!confirm("Remover esta foto?")) return;
    try {
      const res = await api.delete("/work-orders/" + id + "/photos/" + publicId);
      setOrder((prev: any) => ({ ...prev, photos: res.data.photos }));
    } catch { setMsg("Erro ao remover foto"); }
  };

  const addChecklistItem = () => { if (!newTask.trim()) return; setChecklist([...checklist, { id: Date.now().toString(), text: newTask.trim(), done: false }]); setNewTask(""); };
  const toggleChecklistItem = (itemId: string) => setChecklist(checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i));
  const removeChecklistItem = (itemId: string) => setChecklist(checklist.filter(i => i.id !== itemId));
  const toggleShowStatus = (itemId: string) => setChecklist(checklist.map(i => i.id === itemId ? { ...i, showStatus: !i.showStatus } : i));
  const setItemCompleted = (itemId: string, value: string) => setChecklist(checklist.map(i => i.id === itemId ? { ...i, completed: value } : i));
  const setItemAutoMode = (itemId: string, value: string) => setChecklist(checklist.map(i => i.id === itemId ? { ...i, autoMode: value } : i));
  const searchParts = async (term: string) => {
    setPartSearch(term);
    setNewMaterial({ ...newMaterial, name: term });
    if (term.length < 2) { setPartResults([]); setShowPartDropdown(false); return; }
    try {
      const r = await api.get("/parts/", { params: { search: term, limit: 8 } });
      setPartResults(r.data);
      setShowPartDropdown(r.data.length > 0);
    } catch { setPartResults([]); setShowPartDropdown(false); }
  };
  const selectPart = (part: any) => {
    setNewMaterial({ name: part.name, quantity: "1", unit: part.unit || "un" });
    setPartSearch(part.name);
    setShowPartDropdown(false);
    setPartResults([]);
  };
  const addMaterial = () => { if (!newMaterial.name.trim()) return; setMaterials([...materials, { id: Date.now().toString(), ...newMaterial }]); setNewMaterial({ name: "", quantity: "1", unit: "un" }); setPartSearch(""); setShowPartDropdown(false); };
  const removeMaterial = (matId: string) => setMaterials(materials.filter(m => m.id !== matId));
  const updateMaterial = (matId: string, field: string, value: string) => setMaterials(materials.map(m => m.id === matId ? { ...m, [field]: value } : m));

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    setSavingCompany(true);
    try {
      const res = await api.post("/contracted-companies/", { name: newCompanyName.trim(), cnpj: newCompanyCnpj.trim() || null });
      setCompanies(prev => [...prev, res.data]);
      setForm((prev: any) => ({ ...prev, contractor_name: res.data.name }));
      setNewCompanyName("");
      setNewCompanyCnpj("");
      setShowCompanyModal(false);
      setMsg("Empresa cadastrada e selecionada!");
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Erro ao cadastrar empresa"); } finally { setSavingCompany(false); }
  };

  const checklistDone = checklist.filter(i => i.done).length;
  const checklistTotal = checklist.length;
  const isFuelOS = order?.title?.toLowerCase().includes("abastecimento") || order?.title?.toLowerCase().includes("combustivel");

  if (loading) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">Carregando...</main></div>;
  if (!order) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">OS nao encontrada</main></div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 text-sm">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="font-mono text-blue-700 font-bold text-lg">{order.number}</span>
            <h1 className="text-2xl font-bold text-slate-800">{order.title}</h1>
            <p className="text-slate-500 text-sm">
              {MAINTENANCE_LABEL[order.maintenance_type] || order.maintenance_type}
              {asset ? " \u2013 " + asset.name + " (" + asset.tag + ")" : ""}
              {subAsset ? " \u203a " + subAsset.name : ""}
            </p>
            {order.description && <p className="text-slate-400 text-sm mt-1">{order.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors">
              <Printer size={15} /> Imprimir OS
            </button>
            <button onClick={() => setShowAPR(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Printer size={15} /> Imprimir APR
            </button>
            <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", PRIORITY_BADGE[form.priority])}>{PRIORITY_LABEL[form.priority] || form.priority}</span>
            <span className={clsx("px-3 py-1 rounded-full text-sm font-medium", STATUS_BADGE[form.status])}>{STATUS_LABEL[form.status] || form.status}</span>
          </div>
        </div>

        {msg && (
          <div className={clsx("mb-4 px-4 py-3 rounded-lg text-sm font-medium", msg.includes("Erro") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>{msg}</div>
        )}

        {subAsset && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <ClipboardList size={16} className="text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-indigo-800">Subativo: {subAsset.name}</p>
              <p className="text-xs text-indigo-600">Tag: {subAsset.tag} | Tipo: {subAsset.asset_type}</p>
            </div>
          </div>
        )}

        {isFuelOS && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <Fuel size={18} className="text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">OS de Abastecimento de Combustivel</p>
              <p className="text-xs text-blue-600">Informe a quantidade de litros abastecidos no campo abaixo.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-700">Status e Prioridade</h2>
            <div><label className={lbl}>Status</label>
              <select className={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Prioridade</label>
              <select className={inp} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-700">Prazos</h2>
            <div><label className={lbl}>Inicio Previsto</label><input type="datetime-local" className={inp} value={form.scheduled_start} onChange={e => setForm({ ...form, scheduled_start: e.target.value })} /></div>
            <div><label className={lbl}>Fim Previsto</label><input type="datetime-local" className={inp} value={form.scheduled_end} onChange={e => setForm({ ...form, scheduled_end: e.target.value })} /></div>
            <div><label className={lbl}>Inicio Real</label><input type="datetime-local" className={inp} value={form.actual_start} onChange={e => setForm({ ...form, actual_start: e.target.value })} /></div>
            <div><label className={lbl}>Fim Real</label><input type="datetime-local" className={inp} value={form.actual_end} onChange={e => setForm({ ...form, actual_end: e.target.value })} /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 space-y-4">
          <h2 className="font-semibold text-slate-700">Execucao</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className={lbl}>Fiscal Trensurb (1)</label>
              <div className="flex gap-2 items-center">
                <User size={15} className="text-slate-400 shrink-0" />
                <input
                  className={inp}
                  value={form.fiscal_1 || ""}
                  onChange={e => setForm({ ...form, fiscal_1: e.target.value })}
                  onFocus={() => setFiscalDropdownOpen(1)}
                  onBlur={() => { setTimeout(() => setFiscalDropdownOpen(null), 150); registerFiscalUse(form.fiscal_1 || ""); }}
                  placeholder="Nome do fiscal Trensurb"
                  autoComplete="off"
                />
              </div>
              {fiscalDropdownOpen === 1 && fiscalSuggestions.filter(f => !form.fiscal_1 || f.name.toLowerCase().includes(form.fiscal_1.toLowerCase())).length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {fiscalSuggestions.filter(f => !form.fiscal_1 || f.name.toLowerCase().includes(form.fiscal_1.toLowerCase())).map(f => (
                    <button key={f.name} type="button"
                      onMouseDown={() => { setForm((prev: any) => ({ ...prev, fiscal_1: f.name })); setFiscalDropdownOpen(null); registerFiscalUse(f.name); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-700">
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <label className={lbl}>Fiscal Trensurb (2)</label>
              <div className="flex gap-2 items-center">
                <User size={15} className="text-slate-400 shrink-0" />
                <input
                  className={inp}
                  value={form.fiscal_2 || ""}
                  onChange={e => setForm({ ...form, fiscal_2: e.target.value })}
                  onFocus={() => setFiscalDropdownOpen(2)}
                  onBlur={() => { setTimeout(() => setFiscalDropdownOpen(null), 150); registerFiscalUse(form.fiscal_2 || ""); }}
                  placeholder="Nome do fiscal Trensurb (opcional)"
                  autoComplete="off"
                />
              </div>
              {fiscalDropdownOpen === 2 && fiscalSuggestions.filter(f => !form.fiscal_2 || f.name.toLowerCase().includes(form.fiscal_2.toLowerCase())).length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {fiscalSuggestions.filter(f => !form.fiscal_2 || f.name.toLowerCase().includes(form.fiscal_2.toLowerCase())).map(f => (
                    <button key={f.name} type="button"
                      onMouseDown={() => { setForm((prev: any) => ({ ...prev, fiscal_2: f.name })); setFiscalDropdownOpen(null); registerFiscalUse(f.name); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-700">
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Empresa Terceirizada</label>
              <div className="flex gap-2">
                <input className={inp} value={form.contractor_name} onChange={e => setForm({ ...form, contractor_name: e.target.value })} placeholder="Nome da empresa" />
                <button type="button" onClick={() => setShowCompanyModal(true)} title="Selecionar empresa cadastrada" className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 transition-colors">
                  <Building2 size={15} /><ChevronDown size={12} />
                </button>
              </div>
            </div>
            <div className="relative">
              <label className={lbl}>Tecnico Preposto</label>
              <div className="flex gap-2 items-center">
                <User size={15} className="text-slate-400 shrink-0" />
                <input
                  className={inp}
                  value={form.contractor_preposto || ""}
                  onChange={e => setForm({ ...form, contractor_preposto: e.target.value })}
                  onFocus={() => setPrepostoDropdownOpen(true)}
                  onBlur={() => { setTimeout(() => setPrepostoDropdownOpen(false), 150); registerPrepostoUse(form.contractor_preposto || ""); }}
                  placeholder="Nome e funcao do preposto"
                  autoComplete="off"
                />
              </div>
              {prepostoDropdownOpen && companyPrepostos.filter(p => !form.contractor_preposto || p.name.toLowerCase().includes(form.contractor_preposto.toLowerCase())).length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {companyPrepostos.filter(p => !form.contractor_preposto || p.name.toLowerCase().includes(form.contractor_preposto.toLowerCase())).map(p => (
                    <button key={p.id} type="button"
                      onMouseDown={() => { setForm((prev: any) => ({ ...prev, contractor_preposto: p.name })); setPrepostoDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-700">
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              {!form.contractor_name && (
                <p className="text-xs text-slate-400 mt-1">Selecione a empresa primeiro para ver prepostos cadastrados.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Horas Internas</label><input type="number" step="0.5" className={inp} value={form.internal_hours} onChange={e => setForm({ ...form, internal_hours: e.target.value })} placeholder="Ex: 8" /></div>
            <div><label className={lbl}>Horas Terceirizadas</label><input type="number" step="0.5" className={inp} value={form.contractor_hours} onChange={e => setForm({ ...form, contractor_hours: e.target.value })} placeholder="Ex: 4" /></div>
          </div>

          <div className={clsx("rounded-xl p-4 border", isFuelOS ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200")}>
            <label className={clsx("flex items-center gap-2 text-sm font-medium mb-2", isFuelOS ? "text-blue-800" : "text-slate-700")}>
              <Fuel size={15} className={isFuelOS ? "text-blue-600" : "text-slate-500"} />
              Combustivel Abastecido (litros)
              {isFuelOS && <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">Obrigatorio para esta OS</span>}
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              className={clsx(inp, isFuelOS ? "border-blue-300 focus:ring-blue-500 bg-white" : "")}
              value={form.fuel_liters_added}
              onChange={e => setForm({ ...form, fuel_liters_added: e.target.value })}
              placeholder="Ex: 150.5"
            />
            {isFuelOS && <p className="text-xs text-blue-600 mt-1">Informe a quantidade exata de litros abastecidos no gerador.</p>}
          </div>

          <div><label className={lbl}>Observacoes</label><textarea className={inp} rows={2} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} placeholder="Observacoes gerais da manutencao..." /></div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <ClipboardList size={15} className="text-slate-500" /> Checklist
              {checklistTotal > 0 && <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", checklistDone === checklistTotal ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>{checklistDone}/{checklistTotal}</span>}
            </h2>
            <button type="button" onClick={openImportModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors">
              <Download size={13} /> Importar Template
            </button>
          </div>
          {checklistTotal > 0 && <div className="w-full bg-slate-100 rounded-full h-2 mb-3"><div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(checklistDone / checklistTotal) * 100}%` }} /></div>}
          <div className="space-y-2 mb-3">
            {checklist.map(item => (
              <div key={item.id} className="rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3 p-2">
                  <input type="checkbox" checked={item.done} onChange={() => toggleChecklistItem(item.id)} className="w-4 h-4 rounded accent-blue-600" />
                  <span className={clsx("text-sm flex-1", item.done && "line-through text-slate-400")}>{item.text}</span>
                  <button
                    type="button"
                    onClick={() => toggleShowStatus(item.id)}
                    title="Marcar status de conclusao para impressao"
                    className={clsx("text-xs px-2 py-1 rounded-md border transition-colors", item.showStatus ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-400 hover:bg-slate-100")}
                  >
                    + Status
                  </button>
                  <button onClick={() => removeChecklistItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={14} /></button>
                </div>
                {item.showStatus && (
                  <div className="px-2 pb-2 pl-9 space-y-1.5">
                    <MiniStatusToggle value={item.completed} onChange={v => setItemCompleted(item.id, v)} />
                    <MiniSimNaoToggle label="Modo Auto?" value={item.autoMode} onChange={v => setItemAutoMode(item.id, v)} />
                  </div>
                )}
              </div>
            ))}
            {checklist.length === 0 && <p className="text-slate-400 text-sm py-2">Nenhuma tarefa adicionada.</p>}
          </div>
          <div className="flex gap-2">
            <input className={clsx(inp, "flex-1")} value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); }}} placeholder="Nova tarefa manual..." />
            <button type="button" onClick={addChecklistItem} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Plus size={15} /></button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2 mb-3"><Package size={15} className="text-slate-500" /> Materiais Utilizados</h2>
          {materials.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-2">
                <span className="col-span-6">Material / Peca</span><span className="col-span-2 text-center">Qtd</span><span className="col-span-3">Unidade</span><span className="col-span-1"></span>
              </div>
              {materials.map(mat => (
                <div key={mat.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-lg px-2 py-1.5">
                  <input className="col-span-6 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={mat.name} onChange={e => updateMaterial(mat.id, "name", e.target.value)} />
                  <input type="number" className="col-span-2 border border-slate-200 rounded px-2 py-1 text-sm text-center focus:outline-none" value={mat.quantity} onChange={e => updateMaterial(mat.id, "quantity", e.target.value)} min="0" step="0.1" />
                  <select className="col-span-3 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none" value={mat.unit} onChange={e => updateMaterial(mat.id, "unit", e.target.value)}>
                    {["un","kg","L","m","m2","cx","par","jogo"].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button onClick={() => removeMaterial(mat.id)} className="col-span-1 flex justify-center text-slate-300 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-12 gap-2 items-center">
            <input className="col-span-6 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newMaterial.name} onChange={e => searchParts(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMaterial(); }}} placeholder="Nome do material ou peca..." onFocus={() => { if (partResults.length > 0) setShowPartDropdown(true); }} />
            {showPartDropdown && partResults.length > 0 && (
              <div className="absolute z-50 left-0 top-full mt-1 w-1/2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {partResults.map((part: any) => (
                  <button key={part.id} type="button" onClick={() => selectPart(part)} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 border-b border-slate-50 last:border-0">
                    <span className="font-medium">{part.name}</span>
                    {part.unit && <span className="text-xs text-slate-400 ml-2">({part.unit})</span>}
                  </button>
                ))}
              </div>
            )}
            <input type="number" className="col-span-2 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" value={newMaterial.quantity} onChange={e => setNewMaterial({ ...newMaterial, quantity: e.target.value })} min="0" step="0.1" />
            <select className="col-span-3 border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newMaterial.unit} onChange={e => setNewMaterial({ ...newMaterial, unit: e.target.value })}>
              {["un","kg","L","m","m2","cx","par","jogo"].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <button type="button" onClick={addMaterial} className="col-span-1 flex justify-center px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Plus size={15} /></button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 space-y-4">
          <h2 className="font-semibold text-slate-700">Analise Tecnica</h2>
          <div><label className={lbl}>Causa Raiz</label><textarea className={inp} rows={2} value={form.root_cause} onChange={e => setForm({ ...form, root_cause: e.target.value })} placeholder="Descreva a causa raiz do problema..." /></div>
          <div><label className={lbl}>Acao Corretiva</label><textarea className={inp} rows={2} value={form.corrective_action} onChange={e => setForm({ ...form, corrective_action: e.target.value })} placeholder="Descreva a acao corretiva aplicada..." /></div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2"><Camera size={15}/> Fotos da Manutencao</h2>
            <label className={clsx("flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm cursor-pointer", uploading && "opacity-50 pointer-events-none")}>
              <Camera size={14}/>{uploading ? "Enviando..." : "Adicionar Foto"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          </div>
          {(!order?.photos || order.photos.length === 0) ? <p className="text-slate-400 text-sm">Nenhuma foto adicionada.</p> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(order?.photos || []).map((p: any) => (
                <div key={p.public_id} className="relative group">
                  <img src={p.url} alt="foto" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                  <button onClick={() => handlePhotoDelete(p.public_id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                  <p className="text-xs text-slate-400 mt-1">{new Date(p.uploaded_at).toLocaleDateString("pt-BR")}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium">
            <Printer size={15} /> Imprimir OS
          </button>
          <button onClick={() => setShowAPR(true)} className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium">
            <Printer size={15} /> Imprimir APR
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            <Save size={15} />{saving ? "Salvando..." : "Salvar Alteracoes"}
          </button>
          {form.status !== "completed" && form.status !== "cancelled" && (
            <button onClick={handleComplete} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              <CheckCircle size={15} />Concluir OS
            </button>
          )}
        </div>

        {showAPR && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">APR / Check-List de Seguranca</h2>
                <div className="flex gap-2">
                  <button onClick={handlePrintAPR} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium">
                    <Printer size={14} /> Imprimir APR
                  </button>
                  <button onClick={() => setShowAPR(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Equipamentos de Seguranca / EPIs</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {["Capacete de seguranca","Protetor facial verde","Oculos de protecao","Protetor auditivo","Respirador","Perneira","Tapete isolante","Vara de manobra","Detector de tensao","Aterramento temporario","Fitas/cones","Radio comunicador"].map(epi => (
                      <label key={epi} className={clsx("flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-all", aprSelections[`epi_${epi}`] ? "border-orange-400 bg-orange-50 text-orange-800 font-medium" : "border-slate-200 hover:border-slate-300 text-slate-600")}>
                        <input type="checkbox" checked={!!aprSelections[`epi_${epi}`]} onChange={() => toggleAPR(`epi_${epi}`)} className="accent-orange-500" />
                        {epi}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Riscos Identificados</h3>
                  <div className="space-y-3">
                    {[
                      {key:"eletrico", titulo:"Riscos Eletricos", itens:["Contato com partes energizadas","Arco eletrico / flash eletrico","Inducao eletromagnetica","Eletricidade estatica"]},
                      {key:"queda", titulo:"Riscos de Queda", itens:["Queda de mesmo nivel","Queda de nivel diferente","Queda de objetos/ferramentas"]},
                      {key:"incendio", titulo:"Riscos de Incendio/Explosao", itens:["Presenca de gases inflamaveis","Curto circuito / faiscas","Materiais combustiveis no local"]},
                      {key:"mecanico", titulo:"Riscos Mecanicos", itens:["Contato com partes moveis de maquinas","Ferramentas inadequadas ou defeituosas","Projecao de particulas/fragmentos"]},
                      {key:"ergonomico", titulo:"Riscos Ergonomicos", itens:["Postura inadequada em estruturas","Trabalhos agaixados em paineis","Levantamento e transporte manual de cargas (23kg)"]},
                      {key:"terceiros", titulo:"Riscos a Terceiros", itens:["Energizacao acidental","Colisao de veiculos"]},
                    ].map((section: any) => (
                      <div key={section.key} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-3 py-2 font-medium text-sm text-slate-700">{section.titulo}</div>
                        <div className="p-2 grid grid-cols-2 gap-1">
                          {section.itens.map((item: string) => (
                            <label key={item} className={clsx("flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-all", aprSelections[`risco_${item}`] ? "bg-red-50 text-red-700 font-medium" : "hover:bg-slate-50 text-slate-600")}>
                              <input type="checkbox" checked={!!aprSelections[`risco_${item}`]} onChange={() => toggleAPR(`risco_${item}`)} className="accent-red-500" />
                              {item}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCompanyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Building2 size={18} className="text-blue-600" /> Empresas Terceirizadas</h2>
                <button onClick={() => setShowCompanyModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">Selecionar empresa cadastrada</p>
                  {companies.length === 0 ? (
                    <p className="text-slate-400 text-sm py-2">Nenhuma empresa cadastrada ainda.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {companies.map(c => (
                        <button key={c.id} type="button"
                          onClick={() => { setForm((prev: any) => ({ ...prev, contractor_name: c.name })); setShowCompanyModal(false); }}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-slate-800">{c.name}</span>
                            {c.cnpj && <span className="text-xs text-slate-400">{c.cnpj}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-3">Cadastrar nova empresa</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nome da empresa</label>
                      <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder="Razao social ou nome fantasia" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ (opcional)</label>
                      <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newCompanyCnpj} onChange={e => setNewCompanyCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button type="button" onClick={() => setShowCompanyModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={handleCreateCompany} disabled={!newCompanyName.trim() || savingCompany}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                  {savingCompany ? "Salvando..." : "Cadastrar e Selecionar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Download size={18} className="text-indigo-600" /> Importar Checklist</h2>
                <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                {loadingTemplates ? <p className="text-center text-slate-400 py-8">Carregando templates...</p> :
                  templates.length === 0 ? <p className="text-center text-slate-400 py-8">Nenhum checklist cadastrado.</p> : (
                    <>
                      <div>
                        <label className={lbl}>Selecione o template</label>
                        <div className="space-y-2">
                          {templates.map(t => (
                            <button key={t.id} type="button" onClick={() => setSelectedTemplate(t.id)}
                              className={clsx("w-full text-left p-3 rounded-xl border transition-all", selectedTemplate === t.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50")}>
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm text-slate-800">{t.name}</span>
                                <span className="text-xs text-slate-400">{t.items.length} tarefas</span>
                              </div>
                              {t.category && <span className="text-xs text-indigo-600">{t.category}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                      {checklist.length > 0 && (
                        <div>
                          <label className={lbl}>Modo de importacao</label>
                          <div className="flex gap-3">
                            <button type="button" onClick={() => setImportMode("append")} className={clsx("flex-1 py-2 rounded-lg border text-sm transition-all", importMode === "append" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>Adicionar ao existente</button>
                            <button type="button" onClick={() => setImportMode("replace")} className={clsx("flex-1 py-2 rounded-lg border text-sm transition-all", importMode === "replace" ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>Substituir tudo</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={handleImport} disabled={!selectedTemplate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">Importar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
