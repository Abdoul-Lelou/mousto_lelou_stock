import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
    X, ChevronLeft, ChevronRight,
    Search, RotateCcw, Calendar, User, Filter,
    ArrowUp, ArrowDown, ArrowUpDown, TrendingDown, TrendingUp, ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

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

type FilterType = 'all' | 'in' | 'out';
type DateRange = 'all' | 'today' | 'week' | 'month';
type SortField = 'date' | 'quantity' | 'total';
type SortOrder = 'asc' | 'desc';

export const AuditJournal = () => {
    const { user } = useAuth();
    const [movements, setMovements] = useState<MovementWithAuthor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMovement, setSelectedMovement] = useState<MovementWithAuthor | null>(null);
    const [authors, setAuthors] = useState<Array<{ id: string, name: string }>>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter states
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [filterAuthor, setFilterAuthor] = useState<string>('all');
    const [filterDateRange, setFilterDateRange] = useState<DateRange>('all');
    const [searchProduct, setSearchProduct] = useState('');

    // Sort states
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    useEffect(() => {
        fetchInitialData();
    }, [user]);

    const fetchInitialData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await Promise.all([
                fetchMovements(),
                fetchAuthors()
            ]);
        } catch (error: any) {
            toast.error("Erreur de chargement", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const fetchAuthors = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, firstname, lastname')
            .order('firstname');

        if (error) throw error;
        setAuthors((data || []).map(p => ({
            id: p.id,
            name: `${p.firstname} ${p.lastname}`
        })));
    };

    const fetchMovements = async () => {
        const { data, error } = await supabase
            .from('stock_movements')
            .select(`
                id, type, quantity, reason, created_at, created_by,
                products ( name, unit_price ),
                profiles:created_by ( firstname, lastname )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const normalizedData: MovementWithAuthor[] = (data || []).map((m: any) => ({
            ...m,
            products: Array.isArray(m.products) ? m.products[0] : m.products,
            author: m.profiles ? `${m.profiles.firstname} ${m.profiles.lastname}` : 'Système'
        }));

        setMovements(normalizedData);
    };

    const resetFilters = () => {
        setFilterType('all');
        setFilterAuthor('all');
        setFilterDateRange('all');
        setSearchProduct('');
        setSortField('date');
        setSortOrder('desc');
        setCurrentPage(1);
        toast.success("Filtres réinitialisés");
    };

    const filteredAndSortedMovements = useMemo(() => {
        let result = [...movements];

        // Type Filter
        if (filterType !== 'all') {
            result = result.filter(m => m.type === filterType);
        }

        // Author Filter
        if (filterAuthor !== 'all') {
            result = result.filter(m => m.created_by === filterAuthor);
        }

        // Product Search
        if (searchProduct.trim()) {
            const search = searchProduct.toLowerCase();
            result = result.filter(m =>
                m.products?.name.toLowerCase().includes(search) ||
                m.reason.toLowerCase().includes(search)
            );
        }

        // Date Range Filter
        if (filterDateRange !== 'all') {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

            result = result.filter(m => {
                const moveDate = new Date(m.created_at).getTime();
                if (filterDateRange === 'today') {
                    return moveDate >= startOfDay;
                }
                if (filterDateRange === 'week') {
                    const sevenDaysAgo = startOfDay - (7 * 24 * 60 * 60 * 1000);
                    return moveDate >= sevenDaysAgo;
                }
                if (filterDateRange === 'month') {
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                    return moveDate >= startOfMonth;
                }
                return true;
            });
        }

        // Sorting
        result.sort((a, b) => {
            let valA: any, valB: any;

            if (sortField === 'date') {
                valA = new Date(a.created_at).getTime();
                valB = new Date(b.created_at).getTime();
            } else if (sortField === 'quantity') {
                valA = a.quantity;
                valB = b.quantity;
            } else if (sortField === 'total') {
                valA = a.quantity * (a.products?.unit_price || 0);
                valB = b.quantity * (b.products?.unit_price || 0);
            }

            if (sortOrder === 'asc') return valA > valB ? 1 : -1;
            return valA < valB ? 1 : -1;
        });

        return result;
    }, [movements, filterType, filterAuthor, filterDateRange, searchProduct, sortField, sortOrder]);

    const totalPages = Math.ceil(filteredAndSortedMovements.length / itemsPerPage);
    const paginatedMovements = filteredAndSortedMovements.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [filterType, filterAuthor, filterDateRange, searchProduct]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
        return sortOrder === 'desc' ? <ArrowDown size={12} className="text-blue-600" /> : <ArrowUp size={12} className="text-blue-600" />;
    };

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
            {/* Header */}
            {/* FILTRES AVANCÉS */}
            <div className="px-8 py-6 border-b border-slate-100 bg-white">
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Recherche */}
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Rechercher un article ou une nature d'opération spécifique..."
                                value={searchProduct}
                                onChange={(e) => setSearchProduct(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                            />
                        </div>

                        {/* Reset rapide */}
                        <button
                            onClick={resetFilters}
                            className="p-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all border border-transparent shadow-sm flex items-center justify-center gap-2 group"
                            title="Toutes les opérations"
                        >
                            <RotateCcw size={20} className="group-active:rotate-180 transition-transform duration-500" />
                            <span className="md:hidden font-bold">Réinitialiser</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Type de Mouvement */}
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as FilterType)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs appearance-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer font-bold text-slate-600"
                            >
                                <option value="all">Tous les types</option>
                                <option value="in">Entrées</option>
                                <option value="out">Sorties</option>
                            </select>
                        </div>

                        {/* Auteur */}
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={filterAuthor}
                                onChange={(e) => setFilterAuthor(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs appearance-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer font-bold text-slate-600"
                            >
                                <option value="all">Tous les auteurs</option>
                                {authors.map(author => (
                                    <option key={author.id} value={author.id}>{author.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Période */}
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={filterDateRange}
                                onChange={(e) => setFilterDateRange(e.target.value as DateRange)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs appearance-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer font-bold text-slate-600"
                            >
                                <option value="all">Toute la période</option>
                                <option value="today">Aujourd'hui</option>
                                <option value="week">7 derniers jours</option>
                                <option value="month">Ce mois-ci</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tableau */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse table-fixed">
                    <thead className="bg-slate-50/50 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                        <tr className="h-12">
                            <th
                                className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors group w-[180px] min-w-[180px]"
                                onClick={() => toggleSort('date')}
                            >
                                <div className="flex items-center gap-2">
                                    Date & Heure <SortIcon field="date" />
                                </div>
                            </th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center w-[120px] min-w-[120px]">Type</th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest w-[250px] min-w-[250px]">Produit</th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest w-[250px] min-w-[250px]">Opération / Motif</th>
                            <th
                                className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right cursor-pointer hover:text-blue-600 transition-colors group w-[120px] min-w-[120px]"
                                onClick={() => toggleSort('quantity')}
                            >
                                <div className="flex items-center justify-end gap-2">
                                    Quantité <SortIcon field="quantity" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right cursor-pointer hover:text-blue-600 transition-colors group w-[180px] min-w-[180px]"
                                onClick={() => toggleSort('total')}
                            >
                                <div className="flex items-center justify-end gap-2">
                                    Valeur Totale <SortIcon field="total" />
                                </div>
                            </th>
                            <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest w-[150px] min-w-[150px]">Auteur</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-20">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                                    <span className="text-slate-400 font-medium">Analyse des flux...</span>
                                </div>
                            </td></tr>
                        ) : paginatedMovements.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-20 text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                    <Filter size={32} className="opacity-20" />
                                    <p className="font-bold">Aucun mouvement trouvé</p>
                                    <p className="text-xs">Ajustez vos filtres pour voir plus de résultats</p>
                                </div>
                            </td></tr>
                        ) : (
                            paginatedMovements.map((m) => {
                                const totalValue = (m.quantity || 0) * (m.products?.unit_price || 0);
                                return (
                                    <tr
                                        key={m.id}
                                        onClick={() => setSelectedMovement(m)}
                                        className="h-16 hover:bg-blue-50/40 transition-colors cursor-pointer group border-transparent hover:border-blue-100"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap align-middle">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 text-xs font-mono">
                                                    {new Date(m.created_at).toLocaleDateString('fr-FR')}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center align-middle">
                                            <div className="flex justify-center">
                                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${m.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                                    {m.type === 'in' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                    {m.type === 'in' ? 'Entrée' : 'Sortie'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <span className="font-bold text-slate-700 block truncate" title={m.products?.name || 'Inconnu'}>
                                                {m.products?.name || 'Inconnu'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <span className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl ${m.reason === 'Vente' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'} block truncate text-center w-fit flex items-center gap-1.5`} title={m.reason}>
                                                {m.reason === 'Vente' ? <><ShoppingBag size={12} /> Vente Validée</> : m.reason}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right align-middle">
                                            <span className={`font-mono font-black text-sm ${m.type === 'in' ? 'text-emerald-600' : 'text-orange-600'}`}>
                                                {m.type === 'in' ? '+' : '-'}{m.quantity.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right align-middle">
                                            <span className="font-mono font-black text-slate-700">
                                                {totalValue.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">FG</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="inline-flex items-center gap-2 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg max-w-full">
                                                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600 flex-shrink-0">
                                                    {m.author.charAt(0)}
                                                </div>
                                                <span className="text-slate-600 text-[10px] font-bold truncate max-w-[100px]">
                                                    {m.author}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Affichage de {paginatedMovements.length} sur {filteredAndSortedMovements.length} • Page <span className="text-blue-600">{currentPage}</span> / {totalPages}
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
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden scale-in-center">
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Type</p>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase ${selectedMovement.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {selectedMovement.type === 'in' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
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

                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-2">Produit</p>
                                <p className="text-lg font-black text-blue-700">{selectedMovement.products?.name || 'N/A'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Quantité</p>
                                    <p className="text-2xl font-mono font-black text-slate-800">
                                        {selectedMovement.type === 'in' ? '+' : '-'}{selectedMovement.quantity.toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Prix Unitaire</p>
                                    <p className="text-lg font-mono font-bold text-slate-700">
                                        {selectedMovement.products?.unit_price?.toLocaleString() || 'N/A'} FG
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-2">Valeur Totale</p>
                                <p className="text-3xl font-mono font-black text-indigo-700">
                                    {((selectedMovement.quantity || 0) * (selectedMovement.products?.unit_price || 0)).toLocaleString()}
                                    <span className="text-sm ml-1 font-medium text-indigo-400 uppercase">FG</span>
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Raison</p>
                                    <p className="text-sm font-medium text-slate-700">{selectedMovement.reason}</p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-1">Agent Responsable</p>
                                        <p className="text-base font-bold text-emerald-700">{selectedMovement.author}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                        {selectedMovement.author.charAt(0)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
