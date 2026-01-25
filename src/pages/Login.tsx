import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast, Toaster } from 'sonner';
import { Layers, Lock, Mail, Loader2, Info } from 'lucide-react';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Supabase Login
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            toast.error("Échec de connexion", { description: error.message });
            setLoading(false);
        } else {
            toast.success("Bienvenue !");
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <Toaster position="top-right" richColors />
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">

                {/* Header */}
                <div className="bg-slate-900 px-8 py-8 text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-900/50 mb-4 transform rotate-3">
                        <Layers size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">MOUSTO<span className="text-blue-500">LELOU</span></h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Gestion de stock centralisée</p>
                </div>

                {/* Form */}
                <div className="p-8 pt-10">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                                    placeholder="admin@lelou.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="password"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "Se connecter"}
                        </button>
                    </form>

                    <div className="mt-8 p-4 bg-blue-50 rounded-2xl flex items-start gap-3">
                        <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
                        <p className="text-xs text-blue-800 leading-relaxed font-medium">Pour accéder à cette application, vous devez disposer d'un compte créé par un administrateur.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
