import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SGM Ferroviario - Gestao de Manutencao",
  description: "Sistema de Gestao de Manutencao de Subestacoes e Geradores",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      </head>
      <body className="bg-slate-100 text-slate-900 antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
// rebuild
