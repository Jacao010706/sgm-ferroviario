"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Plus, RefreshCw, X, Users, UserPlus, Trash2, Pencil, Mail, Phone, BadgeCheck } from "lucide-react";
import clsx from "clsx";

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrador", MANAGER: "Gestor", TECHNICIAN: "Tecnico", ENGINEER: "Engenheiro", OPERATOR: "Operador", VIEWER: "Visualizador", admin: "Administrador", manager: "Gestor", technician: "Tecnico", engineer: "Engenheiro", operator: "Operador", viewer: "Visualizador" };

const ROLE_BADGE: Record<string, string> = { ADMIN: "bg-red-100 text-red-700", MANAGER: "bg-purple-100 text-purple-700", TECHNICIAN: "bg-blue-100 text-blue-700", ENGINEER: "bg-orange-100 text-orange-700", OPERATOR: "bg-green-100 text-green-700", VIEWER: "bg-slate-100 text-slate-600", admin: "bg-red-100 text-red-700", manager: "bg-purple-100 text-purple-700", technician: "bg-blue-100 text-blue-700", engineer: "bg-orange-100 text-orange-700", operator: "bg-green-100 text-green-700", viewer: "bg-slate-100 text-slate-600" };

const emptyTeam = { name: "", specialty: "", description: "" };
const emptyUser = { name: "", email: "", password: "", role: "TECHNICIAN", badge_number: "", phone: "" };

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [teamForm, setTeamForm] = useState<any>({ ...emptyTeam });
  const [userForm, setUserForm] = useState<any>({ ...emptyUser });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"teams" | "members">("teams");

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/teams/").then((r) => setTeams(r.data)).catch(() => setTeams([])),
      api.get("/teams/members").then((r) => setAllUsers(r.data)).catch(() => setAllUsers([])),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleTeamSubmit = async () => {
    if (!teamForm.name.trim()) { setError("Informe o nome da equipe"); return; }
    setSaving(true); setError("");
    try {
      if (editingTeam) {
        await api.patch(`/teams/${editingTeam.id}`, teamForm);
      } else {
        await api.post("/teams/", teamForm);
      }
      setShowTeamModal(false); setTeamForm({ ...emptyTeam }); setEditingTeam(null); load();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? (detail[0]?.msg || "Erro de validacao") : "Erro ao salvar equipe";
      setError(msg);
    } finally { setSaving(false); }
  };

  const handleUserSubmit = async () => {
    if (editingUser) {
      if (!userForm.name) { setError("Informe o nome"); return; }
      setSaving(true); setError("");
      try {
        const payload: any = {
          name: userForm.name,
          role: userForm.role,
          badge_number: userForm.badge_number || null,
          phone: userForm.phone || null,
        };
        await api.patch(`/admin/users/${editingUser.id}`, payload);

        const previousTeamId = editingUser.team_id || null;
        const newTeamId = userForm.team_id || null;
        if (previousTeamId !== newTeamId) {
          if (previousTeamId) await api.delete(`/teams/${previousTeamId}/members/${editingUser.id}`).catch(() => {});
          if (newTeamId) await api.post(`/teams/${newTeamId}/members/${editingUser.id}`).catch(() => {});
        }

        setShowUserModal(false); setUserForm({ ...emptyUser }); setEditingUser(null); load();
      } catch (e: any) {
        const detail = e?.response?.data?.detail;
        const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? (detail[0]?.msg || "Erro de validacao") : "Erro ao atualizar usuario";
        setError(msg);
      } finally { setSaving(false); }
      return;
    }

    if (!userForm.name || !userForm.email || !userForm.password) { setError("Preencha nome, email e senha"); return; }
    setSaving(true); setError("");
    try {
      const payload: any = { ...userForm };
      if (!payload.badge_number) delete payload.badge_number;
      if (!payload.phone) delete payload.phone;
      delete payload.team_id;
      const res = await api.post("/admin/users", payload);
      if (userForm.team_id && res?.data?.id) {
        await api.post(`/teams/${userForm.team_id}/members/${res.data.id}`).catch(() => {});
      }
      setShowUserModal(false); setUserForm({ ...emptyUser }); load();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? (detail[0]?.msg || "Erro de validacao") : "Erro ao criar usuario";
      setError(msg);
    } finally { setSaving(false); }
  };

  const addMember = async (teamId: string, userId: string) => {
    await api.post(`/teams/${teamId}/members/${userId}`).catch(() => {});
    setShowAddMember(null); load();
  };

  const removeMember = async (teamId: string, userId: string) => {
    if (!window.confirm("Remover membro da equipe?")) return;
    await api.delete(`/teams/${teamId}/members/${userId}`).catch(() => {});
    load();
  };

  const deleteTeam = async (teamId: string) => {
    if (!window.confirm("Excluir esta equipe?")) return;
    await api.delete(`/teams/${teamId}`).catch(() => {});
    load();
  };

  const deactivateUser = async (userId: string) => {
    if (!window.confirm("Desativar este usuario?")) return;
    await api.delete(`/admin/users/${userId}`).catch(() => {});
    load();
  };

  const openEditTeam = (team: any) => {
    setEditingTeam(team);
    setTeamForm({ name: team.name, specialty: team.specialty || "", description: team.description || "" });
    setError("");
    setShowTeamModal(true);
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: (user.role || "TECHNICIAN").toUpperCase(),
      badge_number: user.badge_number || "",
      phone: user.phone || "",
      team_id: user.team_id || "",
    });
    setError("");
    setShowUserModal(true);
  };

  const openNewUser = () => {
    setEditingUser(null);
    setUserForm({ ...emptyUser });
    setError("");
    setShowUserModal(true);
  };

  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-sm font-medium text-slate-700 mb-1";

  const unassignedUsers = allUsers.filter(u => !u.team_id);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Equipes e Tecnicos</h1>
            <p className="text-slate-500 text-sm">Gestao de equipes e membros</p>
          </div>
          <div className="flex gap-2">
            <button onClick={openNewUser} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <UserPlus size={15} /> Novo Usuario
            </button>
            <button onClick={() => { setEditingTeam(null); setTeamForm({ ...emptyTeam }); setError(""); setShowTeamModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} /> Nova Equipe
            </button>
            <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white">
              <RefreshCw size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-blue-50 rounded-lg"><Users size={18} className="text-blue-600"/></div>
            <div><p className="text-2xl font-bold text-slate-800">{teams.length}</p><p className="text-xs text-slate-500">Equipes</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-green-50 rounded-lg"><BadgeCheck size={18} className="text-green-600"/></div>
            <div><p className="text-2xl font-bold text-slate-800">{allUsers.length}</p><p className="text-xs text-slate-500">Usuarios Ativos</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-indigo-50 rounded-lg"><Users size={18} className="text-indigo-600"/></div>
            <div><p className="text-2xl font-bold text-slate-800">{allUsers.filter(u => u.team_id).length}</p><p className="text-xs text-slate-500">Em Equipes</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-amber-50 rounded-lg"><UserPlus size={18} className="text-amber-600"/></div>
            <div><p className="text-2xl font-bold text-slate-800">{unassignedUsers.length}</p><p className="text-xs text-slate-500">Sem Equipe</p></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-slate-200 p-1 w-fit">
          <button onClick={() => setActiveTab("teams")} className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "teams" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
            Equipes ({teams.length})
          </button>
          <button onClick={() => setActiveTab("members")} className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "members" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
            Todos os Usuarios ({allUsers.length})
          </button>
        </div>

        {loading ? <p className="text-center text-slate-400 py-10">Carregando...</p> : activeTab === "teams" ? (
          <div className="space-y-4">
            {teams.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Users size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 mb-4">Nenhuma equipe cadastrada</p>
              </div>
            ) : teams.map(team => (
              <div key={team.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800">{team.name}</h3>
                      {team.specialty && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">{team.specialty}</span>}
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{team.member_count} membro{team.member_count !== 1 ? "s" : ""}</span>
                    </div>
                    {team.description && <p className="text-xs text-slate-500">{team.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddMember(showAddMember === team.id ? null : team.id)} className="flex items-center gap-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg">
                      <UserPlus size={12} /> Adicionar
                    </button>
                    <button onClick={() => openEditTeam(team)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>
                    <button onClick={() => deleteTeam(team.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Adicionar membro */}
                {showAddMember === team.id && (
                  <div className="px-4 pb-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-medium text-slate-600 mb-2">Selecione um usuario para adicionar:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {allUsers.filter(u => !u.team_id || u.team_id !== team.id).map(u => (
                        <button key={u.id} onClick={() => addMember(team.id, u.id)} className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-blue-50 rounded-lg text-left transition-colors">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">{u.name[0]}</div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{u.name}</p>
                            <p className="text-xs text-slate-400">{ROLE_LABEL[u.role] || u.role}</p>
                          </div>
                        </button>
                      ))}
                      {allUsers.filter(u => !u.team_id || u.team_id !== team.id).length === 0 && (
                        <p className="text-xs text-slate-400 col-span-2">Todos os usuarios ja estao nesta equipe</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Membros */}
                {team.members.length > 0 && (
                  <div className="border-t border-slate-100">
                    <div className="divide-y divide-slate-50">
                      {team.members.map((m: any) => (
                        <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-bold shrink-0">{m.name[0]}</div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{m.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", ROLE_BADGE[m.role])}>{ROLE_LABEL[m.role] || m.role}</span>
                                {m.badge_number && <span className="text-xs text-slate-400">#{m.badge_number}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {m.phone && <span className="text-xs text-slate-400 flex items-center gap-1"><Phone size={11}/>{m.phone}</span>}
                            {m.email && <span className="text-xs text-slate-400 flex items-center gap-1"><Mail size={11}/>{m.email}</span>}
                            <button onClick={() => openEditUser(m)} className="p-1 hover:bg-blue-50 rounded text-slate-300 hover:text-blue-600"><Pencil size={14} /></button>
                            <button onClick={() => removeMember(team.id, m.id)} className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-500"><X size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Nome", "Email", "Funcao", "Matricula", "Telefone", "Equipe", "Acoes"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhum usuario encontrado</td></tr>
                ) : allUsers.map(u => {
                  const team = teams.find(t => t.id === u.team_id);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">{u.name[0]}</div>
                          <span className="font-medium text-slate-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{u.email}</td>
                      <td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", ROLE_BADGE[u.role])}>{ROLE_LABEL[u.role] || u.role}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{u.badge_number || "--"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{u.phone || "--"}</td>
                      <td className="px-4 py-3 text-xs">{team ? <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{team.name}</span> : <span className="text-slate-400">Sem equipe</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEditUser(u)} className="text-blue-600 hover:underline text-xs">Editar</button>
                          <button onClick={() => deactivateUser(u.id)} className="text-red-500 hover:underline text-xs">Desativar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Equipe */}
        {showTeamModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">{editingTeam ? "Editar Equipe" : "Nova Equipe"}</h2>
                <button onClick={() => { setShowTeamModal(false); setEditingTeam(null); }} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className={lbl}>Nome *</label><input className={inp} value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="Ex: Equipe Eletrica" /></div>
                <div><label className={lbl}>Especialidade</label><input className={inp} value={teamForm.specialty} onChange={e => setTeamForm({ ...teamForm, specialty: e.target.value })} placeholder="Ex: Manutencao Eletrica" /></div>
                <div><label className={lbl}>Descricao</label><textarea className={inp} rows={2} value={teamForm.description} onChange={e => setTeamForm({ ...teamForm, description: e.target.value })} placeholder="Descricao da equipe..." /></div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button onClick={() => { setShowTeamModal(false); setEditingTeam(null); }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button onClick={handleTeamSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? "Salvando..." : editingTeam ? "Salvar" : "Criar Equipe"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Usuario */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">{editingUser ? "Editar Usuario" : "Novo Usuario"}</h2>
                <button onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Nome *</label><input className={inp} value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} placeholder="Nome completo" /></div>
                  <div><label className={lbl}>Matricula</label><input className={inp} value={userForm.badge_number} onChange={e => setUserForm({ ...userForm, badge_number: e.target.value })} placeholder="Ex: TEC001" /></div>
                </div>
                <div>
                  <label className={lbl}>Email {editingUser ? "" : "*"}</label>
                  <input type="email" className={inp} value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} placeholder="email@empresa.com" disabled={!!editingUser} />
                  {editingUser && <p className="text-xs text-slate-400 mt-1">O email nao pode ser alterado por aqui.</p>}
                </div>
                {!editingUser && (
                  <div><label className={lbl}>Senha *</label><input type="password" className={inp} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder="Senha inicial" /></div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Funcao</label>
                    <select className={inp} value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                      {["ADMIN", "MANAGER", "TECHNICIAN", "ENGINEER", "OPERATOR", "VIEWER"].map(k => <option key={k} value={k}>{ROLE_LABEL[k]}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Telefone</label><input className={inp} value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} placeholder="(51) 99999-9999" /></div>
                </div>
                <div>
                  <label className={lbl}>Equipe</label>
                  <select className={inp} value={userForm.team_id || ""} onChange={e => setUserForm({ ...userForm, team_id: e.target.value })}>
                    <option value="">Sem equipe</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button onClick={handleUserSubmit} disabled={saving} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? "Salvando..." : editingUser ? "Salvar Alteracoes" : "Criar Usuario"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
