import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { User, Shield, Key, Mail, Loader2 } from 'lucide-react';

export const ProfilePage = () => {
    const { profile, user } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword) return;
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            toast.success("Mot de passe mis à jour avec succès");
            setNewPassword('');
        } catch (err: any) {
            toast.error("Erreur", { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Mon Profil</h1>
                <p className="text-slate-500 text-sm font-medium italic">Gérez vos informations personnelles et votre sécurité.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Profile Info Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg mb-4">
                            <span className="text-4xl font-black">{profile?.full_name?.charAt(0).toUpperCase() || 'U'}</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{profile?.full_name}</h2>
                        <span className={`mt-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${profile?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {profile?.role || 'Utilisateur'}
                        </span>
                    </div>
                </div>

                {/* Forms Area */}
                <div className="md:col-span-2 space-y-6">

                    {/* General Info Readonly */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                        <h3 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">
                            <User className="text-blue-500" size={18} /> Informations Personnelles
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Nom Complet</label>
                                <div className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 border border-slate-100">
                                    {profile?.full_name}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Email</label>
                                <div className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-slate-700 border border-slate-100 flex items-center gap-2">
                                    <Mail size={16} className="text-slate-400" /> {user?.email}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Rôle Système</label>
                                <div className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-slate-700 border border-slate-100 flex items-center gap-2">
                                    <Shield size={16} className="text-slate-400" /> {profile?.role?.toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Password Change */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                        <h3 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">
                            <Key className="text-orange-500" size={18} /> Sécurité du Compte
                        </h3>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Nouveau mot de passe</label>
                                <input
                                    type="password"
                                    placeholder="Min. 6 caractères"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    minLength={6}
                                />
                            </div>
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={loading || !newPassword}
                                    className="w-full md:w-auto bg-slate-900 text-white px-10 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : "Mettre à jour le mot de passe"}
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
};
