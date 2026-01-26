import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { History, Package, Search, Printer, ChevronLeft, ChevronRight, X, Calendar, User, Tag, Info, BarChart3, RotateCcw } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { type Sale } from '../types';
import { AuditJournal } from '../components/AuditJournal';

import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';

interface ProductSummary {
  name: string;
  inQty: number;
  outQty: number;
  totalValue: number;
}

export const Reports = () => {
  const { role, user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isSynthesisOpen, setIsSynthesisOpen] = useState(false);
  const [productSummaries, setProductSummaries] = useState<ProductSummary[]>([]);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => { fetchSales(); }, [role, user]);

  const fetchSales = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('sales')
      .select(`
        id,
        product_id,
        quantity,
        total_price,
        seller_name,
        created_at,
        created_by,
        products ( name, unit_price )
      `)
      .order('created_at', { ascending: false });

    if (role === 'vendeur') {
      query = query.eq('created_by', user.id);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Erreur de chargement");
    } else {
      const normalizedData: Sale[] = (data || []).map((s: any) => ({
        ...s,
        products: Array.isArray(s.products) ? s.products[0] : s.products
      }));
      setSales(normalizedData);
    }
    setLoading(false);
  };

  const printSingleInvoice = (sale: Sale) => {
    const doc = new jsPDF();
    const date = new Date(sale.created_at).toLocaleString('fr-FR');

    doc.setFontSize(18);
    doc.text("MOUSTO_LELOU - REÇU DE VENTE", 14, 20);

    doc.setFontSize(10);
    doc.text(`N° Transaction: ${sale.id.split('-')[0].toUpperCase()}`, 14, 30);
    doc.text(`Date: ${date}`, 14, 35);
    doc.text(`Vendeur: ${sale.seller_name}`, 14, 40);

    autoTable(doc, {
      startY: 50,
      head: [['Désignation', 'Qté', 'Prix Unitaire', 'Total']],
      body: [[
        sale.products?.name || 'Inconnu',
        sale.quantity,
        `${(sale.total_price / sale.quantity).toLocaleString()} FG`,
        `${sale.total_price.toLocaleString()} FG`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] }
    });

    // Pied de page officiel
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Document généré par le Manager - MOUSTO_LELOU", 105, pageHeight - 10, { align: 'center' });

    doc.save(`Vente_${sale.products?.name || 'Article'}_${sale.id.split('-')[0]}.pdf`);
  };

  const filteredSales = sales.filter(sale => {
    const productName = sale.products?.name || '';
    const sellerName = sale.seller_name || '';

    const matchesProductOrSeller =
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sellerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTransaction =
      transactionSearchTerm === '' ||
      sale.id.toUpperCase().startsWith(transactionSearchTerm.toUpperCase());

    const saleDate = new Date(sale.created_at).getTime();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let matchesDate = true;
    if (dateFilter === 'today') matchesDate = saleDate >= startOfDay;
    if (dateFilter === 'week') matchesDate = saleDate >= (startOfDay - 7 * 24 * 60 * 60 * 1000);
    if (dateFilter === 'month') matchesDate = saleDate >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return matchesProductOrSeller && matchesTransaction && matchesDate;
  });

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem);
  const totalRevenue = filteredSales.reduce((acc, sale) => acc + sale.total_price, 0);

  const handleOpenSynthesis = async () => {
    setLoadingSynthesis(true);
    setIsSynthesisOpen(true);
    try {
      let query = supabase.from('stock_movements').select('type, quantity, products(name, unit_price)');

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateFilter === 'today') query = query.gte('created_at', startOfDay.toISOString());
      if (dateFilter === 'week') query = query.gte('created_at', new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
      if (dateFilter === 'month') query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());

      const { data, error } = await query;
      if (error) throw error;

      const grouping: Record<string, ProductSummary> = {};

      (data || []).forEach((m: any) => {
        const pName = m.products?.name || 'Inconnu';
        const pPrice = m.products?.unit_price || 0;

        if (!grouping[pName]) {
          grouping[pName] = { name: pName, inQty: 0, outQty: 0, totalValue: 0 };
        }

        if (m.type === 'in') {
          grouping[pName].inQty += m.quantity;
        } else {
          grouping[pName].outQty += m.quantity;
          grouping[pName].totalValue += (m.quantity * pPrice);
        }
      });

      // Filtrer par le terme de recherche global if set
      let summaries = Object.values(grouping);
      if (searchTerm) {
        summaries = summaries.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }

      setProductSummaries(summaries.sort((a, b) => b.totalValue - a.totalValue));
    } catch {
      toast.error("Erreur calcul synthèse");
    } finally {
      setLoadingSynthesis(false);
    }
  };

  const exportSynthesisExcel = () => {
    const ws = XLSX.utils.json_to_sheet(productSummaries.map(s => ({
      'Produit': s.name,
      'Entrées (+)': s.inQty,
      'Sorties (-)': s.outQty,
      'Flux Net': s.inQty - s.outQty,
      'Valeur Sorties (FG)': s.totalValue
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Synthèse Stocks");
    XLSX.writeFile(wb, `Synthese_Lelou_${new Date().toLocaleDateString()}.xlsx`);
    toast.success("Export Excel terminé");
  };

  const exportSynthesisPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("MOUSTO_LELOU - RAPPORT DE SYNTHÈSE", 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Période : ${dateFilter === 'all' ? 'Toute' : dateFilter}`, 14, 30);
    doc.text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, 14, 35);

    autoTable(doc, {
      startY: 45,
      head: [['Produit', 'Entrées (+)', 'Sorties (-)', 'Flux Net', 'Valeur Sorties']],
      body: productSummaries.map(s => [
        s.name,
        `+${s.inQty}`,
        `-${s.outQty}`,
        `${s.inQty - s.outQty}`,
        `${s.totalValue.toLocaleString()} FG`
      ]),
      foot: [['TOTAL', '', '', '', `${productSummaries.reduce((a, b) => a + b.totalValue, 0).toLocaleString()} FG`]],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] }
    });

    doc.save(`Rapport_Lelou_${new Date().toLocaleDateString()}.pdf`);
    toast.success("Rapport PDF généré");
  };

  return (
    <div className="pt-6 pb-10 px-4 md:px-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <Toaster position="top-right" richColors />

      {/* HEADER STATISTIQUE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Historique</h1>
          <p className="text-slate-500 text-sm font-medium">Suivi financier de MOUSTO_LELOU</p>
        </div>

        <div className="w-full md:w-auto bg-slate-900 px-8 py-5 rounded-[2rem] text-white shadow-2xl border-b-4 border-slate-700">
          <p className="text-[10px] opacity-60 uppercase font-black tracking-widest mb-1">Chiffre d'Affaire (Filtré)</p>
          <p className="text-3xl font-mono font-bold text-blue-400">
            {totalRevenue.toLocaleString()} <span className="text-sm">FG</span>
          </p>
        </div>
      </div>

      {/* FILTRES AVANCÉS */}
      <div className="bg-white p-4 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Chercher un article ou un vendeur..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchSales}
              className="p-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all border border-transparent shadow-sm flex items-center justify-center font-bold"
              title="Rafraîchir"
            >
              <RotateCcw size={20} />
            </button>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl flex-shrink-0">
            {[
              { id: 'all', label: 'Tout' },
              { id: 'today', label: 'Aujourd\'hui' },
              { id: 'week', label: '7 Jours' },
              { id: 'month', label: 'Mois' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => { setDateFilter(t.id as any); setCurrentPage(1); }}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Vérifier un numéro de reçu (ex: 64967A18)..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs text-slate-500 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 transition-all font-mono"
            value={transactionSearchTerm}
            onChange={(e) => { setTransactionSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse table-fixed">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="h-14">
                <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest w-[160px] min-w-[160px]">Date & Heure</th>
                <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest w-[400px] min-w-[400px]">Article & Vendeur</th>
                <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center w-[100px] min-w-[100px]">Qté</th>
                <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right w-[150px] min-w-[150px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-24 animate-pulse text-slate-400 font-bold uppercase tracking-widest">Récupération des données...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-20 text-slate-400">Aucune vente trouvée.</td></tr>
              ) : currentItems.map((sale) => (
                <tr
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className="h-16 hover:bg-blue-50/50 transition-colors duration-200 group cursor-pointer border-transparent hover:border-blue-100"
                  title="Cliquez pour voir les détails"
                >
                  <td className="px-6 py-4 whitespace-nowrap align-middle">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 font-mono text-xs">{new Date(sale.created_at).toLocaleDateString('fr-FR')}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center transition-all flex-shrink-0">
                        <Package size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 text-sm truncate" title={sale.products?.name}>{sale.products?.name}</span>
                        <div className="flex">
                          <span className="text-[9px] text-slate-900 uppercase font-black tracking-tight bg-slate-100 px-1.5 py-0.5 rounded-md mt-0.5 truncate max-w-[150px]">
                            Par: {sale.seller_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center align-middle">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-mono font-bold text-slate-600 text-[11px]">x{sale.quantity}</span>
                  </td>
                  <td className="px-6 py-4 text-right align-middle">
                    <span className="font-mono font-black text-blue-600 text-sm">
                      {sale.total_price.toLocaleString()} <span className="text-[9px] opacity-60">FG</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex justify-center">
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:text-blue-600 disabled:opacity-20 transition-all cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1.5">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all cursor-pointer ${currentPage === i + 1 ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
                >
                  {i + 1}
                </button>
              )).slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 1))}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:text-blue-600 disabled:opacity-20 transition-all cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE DÉTAILS COMPLET */}
      {selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white rounded-t-[40px] md:rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white"><Info size={18} /></div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Reçu Détaillé</h3>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-2 bg-slate-200/50 text-slate-500 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Article</p>
                  <p className="text-2xl font-black text-slate-900">{selectedSale.products?.name}</p>
                </div>
                <div className="text-right px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest">Prix Total</p>
                  <p className="text-2xl font-black text-blue-600 font-mono">{selectedSale.total_price.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 rounded-3xl space-y-2 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400"><Tag size={16} /><span className="text-[11px] font-black uppercase">Quantité</span></div>
                  <p className="font-black text-2xl text-slate-700 font-mono">x{selectedSale.quantity}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl space-y-2 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400"><User size={16} /><span className="text-[11px] font-black uppercase">Vendeur</span></div>
                  <p className="font-bold text-slate-700 truncate">{selectedSale.seller_name}</p>
                </div>
              </div>

              {/* ID TRANSACTION & PREUVE FLUX */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border-l-4 border-blue-600">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">ID Transaction (Base de données)</p>
                  <p className="text-xs font-mono font-bold text-slate-600 break-all">{selectedSale.id}</p>
                </div>

                <div className="bg-emerald-50 p-4 rounded-2xl border-l-4 border-emerald-600">
                  <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest mb-2 flex items-center gap-2">
                    <History size={14} /> Preuve de Flux Stock
                  </p>
                  <p className="text-xs font-medium text-emerald-800 leading-relaxed">
                    Sortie de <span className="font-bold">{selectedSale.quantity} unités</span> confirmée et lettrée dans l'inventaire.
                  </p>
                </div>
              </div>

              <div className="p-5 bg-blue-600 rounded-[2rem] flex items-center gap-5 text-white shadow-xl shadow-blue-200">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"><Calendar size={24} /></div>
                <div>
                  <p className="text-[10px] text-blue-100 uppercase font-black tracking-widest opacity-80">Date de transaction</p>
                  <p className="text-sm font-bold">
                    {new Date(selectedSale.created_at).toLocaleDateString('fr-FR', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={() => {
                  printSingleInvoice(selectedSale);
                  setSelectedSale(null);
                }}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                <Printer size={20} /> IMPRIMER LE REÇU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOURNAL DES OPÉRATIONS */}
      {/* ANALYSE DES FLUX & JOURNAL */}
      <div className="pt-10 flex flex-col md:flex-row justify-between items-end gap-4 mb-4 px-2">
        <div className="space-y-1">
          <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest opacity-60">Traçabilité & Flux</h3>
          <p className="text-xs text-slate-400 font-medium">Historique complet des mouvements d'inventaire</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden md:block text-[10px] font-black text-slate-400 uppercase tracking-widest">Analyse des flux</p>
          <button
            onClick={handleOpenSynthesis}
            className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-[2rem] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 whitespace-nowrap text-xs font-black uppercase tracking-widest border-b-4 border-slate-700"
          >
            <BarChart3 size={20} className="text-blue-400" />
            Synthèse par Produit
          </button>
        </div>
      </div>
      <AuditJournal />

      {/* MODAL SYNTHÈSE */}
      <Modal
        isOpen={isSynthesisOpen}
        onClose={() => setIsSynthesisOpen(false)}
        title="Synthèse Analytique par Produit"
        maxWidth="max-w-4xl"
      >
        <div className="absolute top-6 right-16 flex gap-2">
          <button onClick={exportSynthesisExcel} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-emerald-100">Excel</button>
          <button onClick={exportSynthesisPDF} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-red-100">PDF</button>
        </div>
        {loadingSynthesis ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="font-black text-[10px] uppercase tracking-widest">Calcul des volumes en cours...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Période Analyse</p>
                <p className="text-sm font-bold text-blue-800 capitalize">{dateFilter === 'all' ? 'Toute la période' : dateFilter}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Valeur Totale Sorties</p>
                <p className="text-xl font-mono font-black text-blue-600">
                  {productSummaries.reduce((acc, s) => acc + s.totalValue, 0).toLocaleString()} FG
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-3xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">Produit</th>
                    <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-center">Entrées (+)</th>
                    <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-center">Sorties (-)</th>
                    <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-center">Flux Net</th>
                    <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-right">Valeur Sorties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {productSummaries.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic">Aucune donnée sur cette période</td></tr>
                  ) : (
                    productSummaries.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700">{s.name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-mono font-bold text-xs">+{s.inQty}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded-lg font-mono font-bold text-xs">-{s.outQty}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-mono font-black text-sm ${s.inQty - s.outQty >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {s.inQty - s.outQty > 0 ? '+' : ''}{s.inQty - s.outQty}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono font-bold text-slate-900">{s.totalValue.toLocaleString()} FG</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};