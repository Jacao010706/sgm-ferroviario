"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Layers, ClipboardList, Radio,
  Bell, BarChart2, Settings, LogOut, Zap,
} from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/dashboard",   label: "Dashboard",        icon: LayoutDashboard },
  { href: "/monitoring",  label: "Monitoramento",     icon: Radio },
  { href: "/assets",      label: "Ativos",            icon: Layers },
  { href: "/work-orders", label: "Ordens de Serviço", icon: ClipboardList },
  { href: "/alerts",      label: "Alertas",           icon: Bell },
  { href: "/reports",     label: "Relatórios",        icon: BarChart2 },
  { href: "/settings",    label: "Configurações",     icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 min-h-screen bg-[#1E3A5F] flex flex-col">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-blue-900">
        <Zap className="text-yellow-400" size={28} />
        <div>
          <p className="text-white font-bold text-sm leading-tight">SGM Ferroviário</p>
          <p className="text-blue-300 text-xs">Gestão de Manutenção</p>
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
      <button className="flex items-center gap-3 px-6 py-4 text-blue-300 hover:text-white text-sm border-t border-blue-900">
        <LogOut size={16} /> Sair
      </button>
    </aside>
  );
}
