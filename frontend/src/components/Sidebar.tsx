"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Layers, ClipboardList, Radio, Bell, BarChart2, Settings, LogOut, Zap, CalendarClock, CheckSquare } from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/monitoring", label: "Monitoramento", icon: Radio },
  { href: "/assets", label: "Ativos", icon: Layers },
  { href: "/work-orders", label: "Ordens de Servico", icon: ClipboardList },
  { href: "/maintenance-plans", label: "Planos de Manutencao", icon: CalendarClock },
  { href: "/checklists", label: "Checklists", icon: CheckSquare },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/reports", label: "Relatorios", icon: BarChart2 },
  { href: "/settings", label: "Configuracoes", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = "access_token=; path=/; max-age=0";
    router.push("/login");
  };

  const userName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "" : "";
  const userRole = typeof window !== "undefined" ? localStorage.getItem("user_role") || "" : "";

  return (
    <aside className="w-64 min-h-screen bg-[#1E3A5F] flex flex-col">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-blue-900">
        <Zap className="text-yellow-400" size={28} />
        <div>
          <p className="text-white font-bold text-sm leading-tight">SGM Ferroviario</p>
          <p className="text-blue-300 text-xs">Gestao de Manutencao</p>
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
  );
}
