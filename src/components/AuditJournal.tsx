import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Info, X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface MovementWithAuthor {
    id: string;
    type: 'in' | 'out';
    quantity: number;
    reason: string;
    created_at: string;
    created_by: string | null;
    products: {
        name: string;
        unit_price: number;
    } | null;
    author: string;
}

import { useAuth } from '../contexts/AuthContext';

export const AuditJournal = () => {
    const { role, user } = useAuth();
    const [movements, setMovements] = useState<MovementWithAuthor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAuthor, setSelectedAuthor] = useState<string>('all');
    const [selectedMovement, setSelectedMovement] = useState<MovementWithAuthor | null>(null);
    const [authors, setAuthors] = useState<Array<{ id: string, name: string }>>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        fetchMovements();
    }, [role, user]);

    const fetchMovements = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('stock_movements')
                .select(`
                    id, type, quantity, reason, created_at, created_by,
                    products ( name, unit_price ),
                    profiles:created_by ( firstname, lastname )
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            const normalizedData: MovementWithAuthor[] = (data || []).map((m: any) => ({
                ...m,
                products: Array.isArray(m.products) ? m.products[0] : m.products,
                author: m.profiles ? `${m.profiles.firstname} ${m.profiles.lastname}` : 'Système'
            }));

            setMovements(normalizedData);

            const uniqueAuthors = Array.from(new Set(normalizedData.map(m => m.created_by).filter(Boolean)));
            const authorsMap = normalizedData.reduce((acc, m) => {
                if (m.created_by && !acc[m.created_by]) {
                    acc[m.created_by] = m.author;
                }
                return acc;
            }, {} as Record<string, string>);

            setAuthors(uniqueAuthors.map(id => ({ id: id!, name: authorsMap[id!] })));
        } catch (error: any) {
            toast.error("Erreur historique", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const filteredMovements = movements.filter(
        m => selectedAuthor === 'all' || m.created_by === selectedAuthor
    );

    // PAGINATION LOGIC
    const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
    const paginatedMovements = filteredMovements.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1); // Reset page on author change
    }, [selectedAuthor]);

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
            {/* Header avec filtre */}
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <FileText size={20} className="text-blue-500" /> Journal des Opérations Récentes
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Audit de flux complet avec traçabilité</p>
                </div>

                <select
                    value={selectedAuthor}
                    onChange={(e) => setSelectedAuthor(e.target.value)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="all">Tous les auteurs</option>
                    {authors.map(author => (
                        <option key={author.id} value={author.id}>{author.name}</option>
                    ))}
                </select>
            </div>

            {/* Tableau */}
            <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Date & Heure</th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Type</th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Produit</th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">Quantité</th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Raison</th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Auteur</th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Détails</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-10 text-slate-400">Chargement...</td></tr>
                        ) : paginatedMovements.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-10 text-slate-400">Aucun mouvement trouvé</td></tr>
                        ) : (
                            paginatedMovements.map((m) => (
                                <tr
                                    key={m.id}
                                    onClick={() => setSelectedMovement(m)}
                                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700 text-xs">
                                                {new Date(m.created_at).toLocaleDateString('fr-FR')}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {new Date(m.created_at).toLocaleTimeString('fr-FR')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${m.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                                            }`}>
                                            {m.type === 'in' ? 'Entrée' : 'Sortie'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-700">{m.products?.name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                                        {m.type === 'in' ? '+' : '-'}{m.quantity}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-xs">{m.reason}</td>
                                    <td className="px-6 py-4 text-slate-600 text-xs font-medium">{m.author}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => setSelectedMovement(m)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all"
                                            title="Voir les détails"
                                        >
                                            <Info size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* BARRE DE PAGINATION */}
            {!loading && totalPages > 1 && (
                <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Page <span className="text-blue-600">{currentPage}</span> sur {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Détails */}
            {selectedMovement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div>
                                <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Détails du Mouvement</h3>
                                <p className="text-xs text-slate-500 font-mono mt-1">ID: {selectedMovement.id.slice(0, 8)}...</p>
                            </div>
                            <button
                                onClick={() => setSelectedMovement(null)}
                                className="p-2 bg-slate-200 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Type & Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Type</p>
                                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase ${selectedMovement.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        {selectedMovement.type === 'in' ? 'Entrée' : 'Sortie'}
                                    </span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Date</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {new Date(selectedMovement.created_at).toLocaleString('fr-FR')}
                                    </p>
                                </div>
                            </div>

                            {/* Produit */}
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-2">Produit</p>
                                <p className="text-lg font-black text-blue-700">{selectedMovement.products?.name || 'N/A'}</p>
                            </div>

                            {/* Quantité & Prix */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Quantité</p>
                                    <p className="text-2xl font-mono font-black text-slate-800">
                                        {selectedMovement.type === 'in' ? '+' : '-'}{selectedMovement.quantity}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Prix Unitaire</p>
                                    <p className="text-lg font-mono font-bold text-slate-700">
                                        {selectedMovement.products?.unit_price?.toLocaleString() || 'N/A'} FG
                                    </p>
                                </div>
                            </div>

                            {/* Valeur Totale */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-2">Valeur Totale</p>
                                <p className="text-3xl font-mono font-black text-indigo-700">
                                    {((selectedMovement.quantity || 0) * (selectedMovement.products?.unit_price || 0)).toLocaleString()}
                                    <span className="text-sm ml-1">FG</span>
                                </p>
                            </div>

                            {/* Raison & Auteur */}
                            <div className="space-y-3">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Raison</p>
                                    <p className="text-sm font-medium text-slate-700">{selectedMovement.reason}</p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-2">Agent Responsable</p>
                                    <p className="text-base font-bold text-emerald-700">{selectedMovement.author}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
