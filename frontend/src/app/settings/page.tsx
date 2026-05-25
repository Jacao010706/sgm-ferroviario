"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Bell, Mail, Save, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserEmail(localStorage.getItem("user_email") || "");
    }
  }, []);

  const [notifSettings, setNotifSettings] = useState({
    email_on_alert_critical: true,
    email_on_alert_high: true,
    email_on_alert_medium: false,
    email_on_wo_created: true,
    email_on_wo_assigned: true,
    email_on_plan_overdue: true,
    email_on_plan_due_soon: true,
    notification_email: "",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notif_settings");
      if (saved) {
        try { setNotifSettings(JSON.parse(saved)); } catch {}
      } else {
        setNotifSettings(prev => ({ ...prev, notification_email: localStorage.getItem("user_email") || "" }));
      }
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem("notif_settings", JSON.stringify(notifSettings));
    setTimeout(() => {
      setSaving(false);
      setMsg("Configuracoes salvas!");
      setTimeout(() => setMsg(""), 3000);
    }, 500);
  };

  const testEmail = async () => {
    if (!notifSettings.notification_email) {
      setMsg("Informe um email para teste");
      return;
    }
    setTestingEmail(true);
    try {
      await api.post("/notifications/test-email", { email: notifSettings.notification_email });
      setMsg("Email de teste enviado! Verifique sua caixa de entrada.");
    } catch {
      setMsg("Erro ao enviar email de teste. Verifique as configuracoes SMTP.");
    } finally {
      setTestingEmail(false);
      setTimeout(() => setMsg(""), 5000);
    }
  };

  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-sm font-medium text-slate-700 mb-1";

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-slate-200"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-1"}`} />
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Configuracoes</h1>
          <p className="text-slate-500 text-sm">Preferencias do sistema</p>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 ${msg.includes("Erro") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            <CheckCircle size={15} /> {msg}
          </div>
        )}

        <div className="max-w-2xl space-y-6">
          {/* Email de notificacao */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Mail size={18} className="text-blue-600" /> Configuracoes de Email
            </h2>
            <div className="space-y-4">
              <div>
                <label className={lbl}>Email para receber notificacoes</label>
                <input
                  type="email"
                  className={inp}
                  value={notifSettings.notification_email}
                  onChange={e => setNotifSettings({ ...notifSettings, notification_email: e.target.value })}
                  placeholder="seu@email.com"
                />
              </div>
              <button
                onClick={testEmail}
                disabled={testingEmail}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm disabled:opacity-50"
              >
                <Mail size={14} /> {testingEmail ? "Enviando..." : "Enviar Email de Teste"}
              </button>
            </div>
          </div>

          {/* Notificacoes de Alertas */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-amber-500" /> Alertas
            </h2>
            <div className="space-y-3">
              {[
                { key: "email_on_alert_critical", label: "Alertas Criticos", desc: "Receber email quando alerta critico for gerado" },
                { key: "email_on_alert_high", label: "Alertas Altos", desc: "Receber email quando alerta de alta prioridade for gerado" },
                { key: "email_on_alert_medium", label: "Alertas Medios", desc: "Receber email quando alerta medio for gerado" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <Toggle
                    checked={notifSettings[item.key as keyof typeof notifSettings] as boolean}
                    onChange={() => setNotifSettings({ ...notifSettings, [item.key]: !notifSettings[item.key as keyof typeof notifSettings] })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notificacoes de OS */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Bell size={18} className="text-blue-600" /> Ordens de Servico
            </h2>
            <div className="space-y-3">
              {[
                { key: "email_on_wo_created", label: "Nova OS criada", desc: "Receber email quando uma nova OS for criada" },
                { key: "email_on_wo_assigned", label: "OS atribuida", desc: "Receber email quando uma OS for atribuida a voce" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <Toggle
                    checked={notifSettings[item.key as keyof typeof notifSettings] as boolean}
                    onChange={() => setNotifSettings({ ...notifSettings, [item.key]: !notifSettings[item.key as keyof typeof notifSettings] })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notificacoes de Planos */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Bell size={18} className="text-purple-600" /> Planos de Manutencao
            </h2>
            <div className="space-y-3">
              {[
                { key: "email_on_plan_overdue", label: "Plano vencido", desc: "Receber email quando um plano estiver vencido" },
                { key: "email_on_plan_due_soon", label: "Plano vencendo em breve", desc: "Receber email quando plano vencer nos proximos 7 dias" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <Toggle
                    checked={notifSettings[item.key as keyof typeof notifSettings] as boolean}
                    onChange={() => setNotifSettings({ ...notifSettings, [item.key]: !notifSettings[item.key as keyof typeof notifSettings] })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              <Save size={15} /> {saving ? "Salvando..." : "Salvar Configuracoes"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

