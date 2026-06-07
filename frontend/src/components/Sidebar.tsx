"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LayoutDashboard, Layers, ClipboardList, Radio, Bell, BarChart2, Settings, LogOut, Zap, Fuel, AlertTriangle, Package, FileText } from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/monitoring", label: "Monitoramento", icon: Radio },
  { href: "/assets", label: "Ativos", icon: Layers },
  { href: "/work-orders", label: "Ordens de Servico", icon: ClipboardList },
  { href: "/maintenance-plans", label: "Planos de Manutencao", icon: Fuel },
  { href: "/fuel-orders", label: "OS Combustivel", icon: Fuel },
  { href: "/checklists", label: "Checklists", icon: ClipboardList },
  { href: "/teams", label: "Equipes e Tecnicos", icon: Layers },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/pending-list", label: "Pendencias SAEE", icon: AlertTriangle },
  { href: "/daily-report", label: "Relatorio Diario", icon: FileText }, // v2
  { href: "/reports", label: "Relatorios", icon: BarChart2 },
  { href: "/parts", label: "Pecas e Materiais", icon: Package },
  { href: "/settings", label: "Configuracoes", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [alertCount, setAlertCount] = useState(0);
  const [fuelAlerts, setFuelAlerts] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const loadAlerts = () => {
      api.get("/alerts/active-count").then((r) => {
        setAlertCount(r.data.total || 0);
      }).catch(() => {});

      // Busca alertas ativos de combustivel
      api.get("/alerts/", { params: { status: "active", limit: 20 } }).then((r) => {
        const fuel = r.data.filter((a: any) =>
          a.metric_name === "fuel_level" || a.title?.toLowerCase().includes("combustivel")
        );
        setFuelAlerts(fuel);
      }).catch(() => {});
    };

    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = "access_token=; path=/; max-age=0";
    router.push("/login");
  };

  const userName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";
  const userRole = typeof window !== "undefined" ? localStorage.getItem("user_role") || "" : "";

  const totalNotifications = alertCount + fuelAlerts.length;

  return (
    <aside className="w-64 min-h-screen bg-[#1E3A5F] flex flex-col relative">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-blue-900">
        <Zap className="text-yellow-400" size={28} />
        <div className="flex-1">
          <p className="text-white font-bold text-sm leading-tight">SGM Ferroviario</p>
          <p className="text-blue-300 text-xs">Gestao de Manutencao</p>
        </div>
        {/* Sino de notificacoes */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Bell size={18} className="text-blue-200" />
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {totalNotifications > 9 ? "9+" : totalNotifications}
              </span>
            )}
          </button>

          {/* Dropdown notificacoes */}
          {showNotifications && (
            <div className="absolute left-0 top-10 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <p className="font-semibold text-slate-800 text-sm">Notificacoes</p>
                <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 text-xs">Fechar</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {fuelAlerts.length === 0 && alertCount === 0 && (
                  <p className="text-center text-slate-400 text-sm py-6">Nenhuma notificacao</p>
                )}
                {fuelAlerts.map((alert: any) => (
                  <div key={alert.id} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50">
                    <div className="flex items-start gap-2">
                      <Fuel size={14} className={alert.metric_value <= 20 ? "text-red-500 mt-0.5 shrink-0" : "text-amber-500 mt-0.5 shrink-0"} />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-800">{alert.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{alert.description}</p>
                        <Link
                          href={`/monitoring?asset=${alert.asset_id}`}
                          onClick={() => setShowNotifications(false)}
                          className="text-xs text-blue-600 hover:underline mt-1 block"
                        >
                          Ver monitoramento â†’
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                {alertCount > 0 && (
                  <div className="px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-800">{alertCount} alerta(s) ativo(s)</p>
                        <Link
                          href="/alerts"
                          onClick={() => setShowNotifications(false)}
                          className="text-xs text-blue-600 hover:underline mt-1 block"
                        >
                          Ver alertas â†’
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={clsx("flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors", pathname.startsWith(href) ? "bg-blue-700 text-white" : "text-blue-200 hover:bg-blue-800 hover:text-white")}>
            <Icon size={18} />
            {label}
            {href === "/alerts" && alertCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{alertCount}</span>
            )}
          </Link>
        ))}
      </nav>

      {userName && (
        <div className="px-6 py-3 border-t border-blue-900">
          <p className="text-white text-xs font-medium truncate">{userName}</p>
          <p className="text-blue-300 text-xs capitalize">{userRole}</p>
        </div>
      )}
      <button onClick={handleLogout} className="flex items-center gap-3 px-6 py-4 text-blue-300 hover:text-white text-sm border-t border-blue-900 transition-colors">
        <LogOut size={16} /> Sair
      </button>
    </aside>
  );
}



