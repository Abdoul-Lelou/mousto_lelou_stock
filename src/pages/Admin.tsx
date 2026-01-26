import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type UserRole, type Profile } from '../types';
import { Shield, UserPlus, Users, Loader2, CheckCircle, X, Ban, Trash2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { logActivity } from '../lib/activity';

export const Admin = () => {
    const { session } = useAuth();
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // New User Form State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<UserRole>('vendeur');
    const [newUserFirstName, setNewUserFirstName] = useState('');
    const [newUserLastName, setNewUserLastName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('profiles').select('*').order('firstname', { ascending: true });
            if (data) setUsers(data as Profile[]);
        } catch {
            toast.error("Erreur chargement utilisateurs");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!session?.access_token) {
            toast.error("Session expirée. Veuillez vous reconnecter.");
            return;
        }

        setCreating(true);

        try {
            const { error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: newUserEmail,
                    password: newUserPassword,
                    role: newUserRole,
                    firstname: newUserFirstName,
                    lastname: newUserLastName
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) throw error;

            toast.success("Utilisateur créé avec succès !");
            setIsModalOpen(false);
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserFirstName('');
            setNewUserLastName('');
            fetchUsers();

        } catch (err: any) {
            toast.error("Erreur", { description: err.message });
        } finally {
            setCreating(false);
        }
    };

    const handleToggleUserStatus = async (userId: string, currentlyActive: boolean) => {
        if (!session?.access_token) {
            toast.error("Session expirée. Veuillez vous reconnecter.");
            return;
        }

        if (userId === session?.user?.id) {
            toast.error("Impossible de modifier votre propre compte");
            return;
        }

        setTogglingId(userId);

        try {
            // Mise à jour directe de la table profiles
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ is_active: !currentlyActive })
                .eq('id', userId);

            if (profileError) throw profileError;

            await logActivity('toggle_user_status', {
                target_user_id: userId,
                new_status: !currentlyActive
            });

            toast.success(currentlyActive ? "Compte désactivé localement" : "Compte activé localement");
            fetchUsers();
        } catch (error: any) {
            console.error('Toggle status error:', error);
            // Affichage de l'erreur brute pour diagnostic (RLS, colonnes, etc.)
            toast.error("Échec de la mise à jour", {
                description: `Détails : ${error.message || 'Erreur inconnue'} (Code: ${error.code || 'N/A'})`
            });
        } finally {
            setTogglingId(null);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (userId === session?.user?.id) {
            toast.error("Impossible de supprimer votre propre compte");
            return;
        }

        if (!window.confirm('Supprimer définitivement ce compte ?')) return;

        try {
            const { error } = await supabase.from('profiles').delete().eq('id', userId);
            if (error) throw error;

            await logActivity('delete_user', { target_user_id: userId });

            toast.success("Compte supprimé avec succès");
            fetchUsers();
        } catch (error: any) {
            console.error('Delete user error:', error);
            toast.error("Échec de la suppression", { description: error.message });
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12 pt-6 space-y-8 animate-in fade-in duration-500">
            <Toaster position="top-right" richColors />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Shield className="text-blue-600" size={32} /> Administration
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">Gestion des utilisateurs et des rôles système.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-[1.5rem] font-black transition-all shadow-xl shadow-slate-200 flex items-center gap-2 text-xs uppercase tracking-widest active:scale-95">
                    <UserPlus size={20} /> Nouvel Utilisateur
                </button>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-black text-slate-700 flex items-center gap-2 uppercase text-[10px] tracking-widest opacity-60">
                        <Users size={20} /> Liste des comptes ({users.length})
                    </h3>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                        <p className="text-sm font-medium">Chargement des utilisateurs...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/80 border-b border-slate-200">
                                <tr className="h-14">
                                    <th className="px-8 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Utilisateur</th>
                                    <th className="px-8 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Rôle</th>
                                    <th className="px-8 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">Statut</th>
                                    <th className="px-8 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-8 py-4">
                                            <div>
                                                <p className="font-bold text-slate-800 text-base">{u.firstname} {u.lastname}</p>
                                                <p className="text-xs text-slate-400 font-mono">ID: {u.id.slice(0, 8)}...</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {u.is_active ? <CheckCircle size={12} /> : <Ban size={12} />}
                                                {u.is_active ? 'Actif' : 'Désactivé'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            {u.id !== session?.user?.id ? (
                                                <div className="flex items-center gap-2 justify-center">
                                                    <button
                                                        onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                                                        disabled={togglingId === u.id}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 min-w-[120px] justify-center ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'} ${togglingId === u.id ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-105'}`}
                                                    >
                                                        {togglingId === u.id ? <Loader2 className="animate-spin" size={14} /> : (u.is_active ? <><Ban size={14} /> Désactiver</> : <><CheckCircle size={14} /> Activer</>)}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                        title="Supprimer définitivement"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-300 font-medium">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Nouvel Utilisateur</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-200 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-8 space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Identité</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input required placeholder="Prénom" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20" value={newUserFirstName} onChange={e => setNewUserFirstName(e.target.value)} />
                                        <input required placeholder="Nom" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20" value={newUserLastName} onChange={e => setNewUserLastName(e.target.value)} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Email</label>
                                    <input type="email" required placeholder="email@exemple.com" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Mot de passe provisoire</label>
                                    <input type="password" required placeholder="••••••••" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Rôle</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button type="button" onClick={() => setNewUserRole('vendeur')} className={`p-4 rounded-2xl font-bold text-sm transition-all ${newUserRole === 'vendeur' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Checkeur / Vendeur</button>
                                        <button type="button" onClick={() => setNewUserRole('admin')} className={`p-4 rounded-2xl font-bold text-sm transition-all ${newUserRole === 'admin' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Admin</button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button type="submit" disabled={creating} className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-bold shadow-xl shadow-slate-300 hover:bg-black transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                                    {creating ? <Loader2 className="animate-spin" size={20} /> : "Créer le compte"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
