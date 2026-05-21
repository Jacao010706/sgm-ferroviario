"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { LayoutDashboard, Layers, ClipboardList, Radio, Bell, BarChart2, Settings, LogOut, Zap, CalendarClock, CheckSquare, Users, X, AlertTriangle, Clock, Wrench } from "lucide-react";
import { api } from "@/lib/api";
import clsx from "clsx";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/monitoring", label: "Monitoramento", icon: Radio },
  { href: "/assets", label: "Ativos", icon: Layers },
  { href: "/work-orders", label: "Ordens de Servico", icon: ClipboardList },
  { href: "/maintenance-plans", label: "Planos de Manutencao", icon: CalendarClock },
  { href: "/checklists", label: "Checklists", icon: CheckSquare },
  { href: "/teams", label: "Equipes e Tecnicos", icon: Users },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/reports", label: "Relatorios", icon: BarChart2 },
  { href: "/settings", label: "Configuracoes", icon: Settings },
];

interface Notification {
  id: string;
  type: "alert" | "work_order" | "maintenance_plan";
  title: string;
  message: string;
  severity?: string;
  time: string;
  read: boolean;
  link?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const [alertsRes, woRes, plansRes] = await Promise.all([
        api.get("/alerts", { params: { status: "active", limit: 5 } }),
        api.get("/work-orders", { params: { limit: 5 } }),
        api.get("/maintenance-plans/due-soon", { params: { days: 7 } }),
      ]);

      const notifs: Notification[] = [];

      // Alertas ativos
      alertsRes.data.forEach((a: any) => {
        notifs.push({
          id: `alert-${a.id}`,
          type: "alert",
          title: a.title,
          message: `Alerta ${a.severity} ativo`,
          severity: a.severity,
          time: new Date(a.triggered_at).toLocaleString("pt-BR"),
          read: false,
          link: "/alerts",
        });
      });

      // OS pendentes/em execucao
      woRes.data.filter((o: any) => ["pending", "in_progress", "assigned"].includes(o.status)).slice(0, 3).forEach((o: any) => {
        notifs.push({
          id: `wo-${o.id}`,
          type: "work_order",
          title: o.title,
          message: `OS ${o.number} — ${o.status === "pending" ? "Pendente" : o.status === "in_progress" ? "Em Execucao" : "Atribuida"}`,
          time: new Date(o.created_at).toLocaleString("pt-BR"),
          read: false,
          link: `/work-orders/${o.id}`,
        });
      });

      // Planos vencendo
      plansRes.data.slice(0, 3).forEach((p: any) => {
        const days = Math.ceil((new Date(p.next_due).getTime() - Date.now()) / 86400000);
        notifs.push({
          id: `plan-${p.id}`,
          type: "maintenance_plan",
          title: p.name,
          message: days < 0 ? `Vencido ha ${Math.abs(days)} dias` : days === 0 ? "Vence hoje!" : `Vence em ${days} dias`,
          time: new Date(p.next_due).toLocaleDateString("pt-BR"),
          read: false,
          link: "/maintenance-plans",
        });
      });

      setNotifications(notifs);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // atualiza a cada 1 min
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifications.length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = "access_token=; path=/; max-age=0";
    router.push("/login");
  };

  const userName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";
  const userRole = typeof window !== "undefined" ? localStorage.getItem("user_role") || "" : "";

  const severityColor: Record<string, string> = {
    critical: "text-red-600", high: "text-orange-500", medium: "text-amber-500", low: "text-green-500",
  };

  return (
    <>
      <aside className="w-64 min-h-screen bg-[#1E3A5F] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-blue-900">
          <div className="flex items-center gap-3">
            <Zap className="text-yellow-400" size={28} />
            <div>
              <p className="text-white font-bold text-sm leading-tight">SGM Ferroviario</p>
              <p className="text-blue-300 text-xs">Gestao de Manutencao</p>
            </div>
          </div>
          {/* Sino de notificacoes */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-blue-800 rounded-lg transition-colors"
            >
              <Bell size={18} className="text-blue-200" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Painel de notificacoes */}
            {showNotifications && (
              <div className="absolute left-0 top-10 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="font-semibold text-slate-800 text-sm">Notificacoes</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Marcar todas lidas</button>
                    )}
                    <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-slate-100 rounded"><X size={14} className="text-slate-400" /></button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell size={24} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">Nenhuma notificacao</p>
                    </div>
                  ) : notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { if (n.link) router.push(n.link); setShowNotifications(false); }}
                      className={clsx("px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors", !n.read && "bg-blue-50/50")}
                    >
                      <div className="flex items-start gap-3">
                        <div className={clsx("mt-0.5 shrink-0",
                          n.type === "alert" ? (severityColor[n.severity || ""] || "text-amber-500") :
                          n.type === "work_order" ? "text-blue-500" : "text-purple-500"
                        )}>
                          {n.type === "alert" ? <AlertTriangle size={16} /> : n.type === "work_order" ? <Wrench size={16} /> : <Clock size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                      </div>
                    </div>
                  ))}
                </div>

                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-slate-100 text-center">
                    <button onClick={() => { router.push("/alerts"); setShowNotifications(false); }} className="text-xs text-blue-600 hover:underline">
                      Ver todos os alertas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-4">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-blue-700 text-white"
                  : "text-blue-200 hover:bg-blue-800 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
              {href === "/alerts" && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
                  {notifications.filter(n => n.type === "alert").length || ""}
                </span>
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
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-6 py-4 text-blue-300 hover:text-white text-sm border-t border-blue-900 transition-colors"
        >
          <LogOut size={16} /> Sair
        </button>
      </aside>
    </>
  );
}
