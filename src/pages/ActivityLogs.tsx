import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { History, Search, Calendar, Loader2, ChevronLeft, ChevronRight, User, Package } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { EmptyState } from '../components/common/EmptyState';

interface ActivityLog {
    id: string;
    user_id: string;
    action: string;
    details: any;
    timestamp: string;
    profiles?: {
        firstname: string;
        lastname: string;
    };
}

export const ActivityLogs = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*, profiles(firstname, lastname)')
                .order('timestamp', { ascending: false });

            if (error) throw error;
            if (data) setLogs(data);
        } catch (err: any) {
            toast.error("Erreur chargement des logs", { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.profiles?.firstname + ' ' + log.profiles?.lastname).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAction = filterAction === 'all' || log.action === filterAction;
        return matchesSearch && matchesAction;
    });

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getActionBadgeColor = (action: string) => {
        if (action.includes('delete')) return 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-100 dark:border-red-900/50';
        if (action.includes('edit')) return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-100 dark:border-blue-900/50';
        if (action.includes('restock')) return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50';
        if (action.includes('archive')) return 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border-orange-100 dark:border-orange-900/50';
        return 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-100 dark:border-slate-700';
    };

    const formatDetails = (log: ActivityLog) => {
        const details = log.details || {};
        switch (log.action) {
            case 'archive_product':
                return `Produit ID: ${details.product_id?.slice(0, 8)}...`;
            case 'delete_user':
                return `Utilisateur cible: ${details.target_user_id?.slice(0, 8)}...`;
            case 'edit_product':
                return `Produit: ${details.name || details.product_id} (Diff: ${details.stock_diff > 0 ? '+' : ''}${details.stock_diff})`;
            case 'restock_product':
                return `Produit: ${details.product_id?.slice(0, 8)}... (+${details.added})`;
            case 'toggle_user_status':
                return `User: ${details.target_user_id?.slice(0, 8)}... (Statut: ${details.new_status ? 'Actif' : 'Bloqué'})`;
            default:
                return JSON.stringify(details);
        }
    };

    const formatActionName = (action: string) => {
        const names: Record<string, string> = {
            'delete_user': 'Suppression Utilisateur',
            'toggle_user_status': 'Changement Statut User',
            'edit_product': 'Modification Produit',
            'restock_product': 'Réapprovisionnement',
            'archive_product': 'Archivage Produit'
        };
        return names[action] || action;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12 pt-6 space-y-8 animate-in fade-in duration-500 font-sans">
            <Toaster position="top-right" richColors />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <History className="text-blue-600" size={32} /> Journal d'Activité
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Traçabilité complète des actions administratives.</p>
                </div>
            </div>

            {/* FILTERS */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full text-slate-800 dark:text-slate-200">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher par action ou utilisateur..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full md:w-auto">
                    <select
                        value={filterAction}
                        onChange={(e) => { setFilterAction(e.target.value); setCurrentPage(1); }}
                        className="bg-transparent text-[10px] font-black uppercase tracking-widest px-4 py-2 outline-none text-slate-600 dark:text-slate-400"
                    >
                        <option value="all">Toutes les actions</option>
                        <option value="delete_user">Suppression User</option>
                        <option value="edit_product">Modif Stock</option>
                        <option value="restock_product">Réappro</option>
                        <option value="archive_product">Archivage</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-400">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                        <p className="text-sm font-medium">Chargement des logs...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <tr className="h-14">
                                    <th className="px-8 py-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Date & Heure</th>
                                    <th className="px-8 py-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Administrateur</th>
                                    <th className="px-8 py-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Action</th>
                                    <th className="px-8 py-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Détails</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {paginatedLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <EmptyState
                                                icon={Package}
                                                title="Aucun journal trouvé"
                                                description="Aucune activité ne correspond à vos critères de recherche ou de filtrage."
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                    <Calendar size={14} className="opacity-50" />
                                                    <span className="font-mono text-xs font-bold">
                                                        {new Date(log.timestamp).toLocaleString('fr-FR', {
                                                            day: '2-digit', month: '2-digit', year: '2-digit',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                        <User size={14} />
                                                    </div>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                                        {log.profiles ? `${log.profiles.firstname} ${log.profiles.lastname}` : 'Système'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${getActionBadgeColor(log.action)}`}>
                                                    {formatActionName(log.action)}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[200px] group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                                                    {formatDetails(log)}
                                                </p>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            {filteredLogs.length} logs au total • Page {currentPage} sur {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all shadow-sm"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all shadow-sm"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
