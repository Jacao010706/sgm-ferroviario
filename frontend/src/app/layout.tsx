import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SGM Ferroviário — Gestão de Manutenção",
  description: "Sistema de Gestão de Manutenção de Subestações e Geradores",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
