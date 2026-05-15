"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { User, Shield, Bell, Database } from "lucide-react";

export default function SettingsPage() {
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    setUserName(localStorage.getItem("user_name") || "");
    setUserRole(localStorage.getItem("user_role") || "");
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Configuracoes</h1>
          <p className="text-slate-500 text-sm">Gerencie suas preferencias e configuracoes do sistema</p>
        </div>
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg"><User size={20} className="text-blue-600" /></div>
              <h2 className="font-semibold text-slate-700">Perfil do Usuario</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input value={userName} readOnly className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Perfil de Acesso</label>
                <input value={userRole} readOnly className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600 capitalize" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg"><Database size={20} className="text-green-600" /></div>
              <h2 className="font-semibold text-slate-700">Informacoes do Sistema</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Versao do Sistema</span>
                <span className="font-medium text-slate-700">SGM Ferroviario v1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">API Backend</span>
                <span className="font-medium text-green-600">Online</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Banco de Dados</span>
                <span className="font-medium text-green-600">PostgreSQL</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Ambiente</span>
                <span className="font-medium text-slate-700">Production</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 rounded-lg"><Bell size={20} className="text-amber-600" /></div>
              <h2 className="font-semibold text-slate-700">Links Uteis</h2>
            </div>
            <div className="space-y-2">
              <a href="https://sgm-ferroviario-production.up.railway.app/api/docs" target="_blank" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 text-sm">
                <span className="text-slate-700">Documentacao da API (Swagger)</span>
                <span className="text-blue-600 text-xs">Abrir</span>
              </a>
              <a href="https://github.com/Jacao010706/sgm-ferroviario" target="_blank" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 text-sm">
                <span className="text-slate-700">Repositorio GitHub</span>
                <span className="text-blue-600 text-xs">Abrir</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}