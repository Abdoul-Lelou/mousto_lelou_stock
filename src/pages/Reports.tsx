import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { History, Package, Search, Printer, ChevronLeft, ChevronRight, X, Calendar, User, Tag, Info } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type Sale } from '../types';
import { AuditJournal } from '../components/AuditJournal';

import { useAuth } from '../contexts/AuthContext';

export const Reports = () => {
  const { role, user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

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
    doc.text("Document généré par le système - MOUSTO_LELOU", 105, pageHeight - 10, { align: 'center' });

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

    return matchesProductOrSeller && matchesTransaction;
  });

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem);
  const totalRevenue = filteredSales.reduce((acc, sale) => acc + sale.total_price, 0);

  return (
    <div className="pt-6 pb-10 px-4 md:px-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <Toaster position="top-right" richColors />

      {/* HEADER STATISTIQUE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Historique</h1>
          <p className="text-slate-500 text-sm font-medium">Suivi financier de MOUSTO_LELOU</p>
        </div>

        <div className="w-full md:w-auto bg-slate-900 px-8 py-5 rounded-[2rem] text-white shadow-2xl border-b-4 border-blue-600">
          <p className="text-[10px] opacity-60 uppercase font-black tracking-widest mb-1">Chiffre d'Affaire Global</p>
          <p className="text-3xl font-mono font-bold text-blue-400">
            {totalRevenue.toLocaleString()} <span className="text-sm">FG</span>
          </p>
        </div>
      </div>

      {/* BARRE D'OUTILS & RECHERCHE TRANSACTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par produit ou vendeur..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <button
            onClick={fetchSales}
            className="hidden md:block p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
          >
            <History size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="bg-slate-900 p-4 rounded-[2rem] border border-slate-800 shadow-xl flex items-center">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
            <input
              type="text"
              placeholder="Vérifier un reçu (ex: 64967A18)..."
              className="w-full pl-12 pr-4 py-4 bg-slate-800 border-none rounded-2xl text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
              value={transactionSearchTerm}
              onChange={(e) => { setTransactionSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Date & Heure</th>
                <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Article</th>
                <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Qté</th>
                <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">Total</th>
                <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Reçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-24 animate-pulse text-slate-400 font-bold uppercase tracking-widest">Récupération des données...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-20 text-slate-400">Aucune vente trouvée.</td></tr>
              ) : currentItems.map((sale) => (
                <tr
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{new Date(sale.created_at).toLocaleDateString()}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all">
                        <Package size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-base">{sale.products?.name}</span>
                        <span className="text-[10px] text-blue-600 uppercase font-black tracking-tighter">Par: {sale.seller_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1.5 bg-slate-100 rounded-lg font-mono font-bold text-slate-600 text-xs">x{sale.quantity}</span>
                  </td>
                  <td className="px-6 py-5 text-right font-mono font-bold text-blue-600 text-base">
                    {sale.total_price.toLocaleString()} <span className="text-[10px] opacity-60">FG</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        printSingleInvoice(sale);
                      }}
                      className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all"
                    >
                      <Printer size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="px-6 py-8 bg-slate-50/50 border-t border-slate-200 flex justify-center">
          <div className="flex items-center gap-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-3 border border-slate-200 rounded-xl bg-white hover:text-blue-600 disabled:opacity-20 transition-all cursor-pointer"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="flex items-center gap-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-11 h-11 rounded-2xl text-xs font-black transition-all cursor-pointer ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-110' : 'bg-white text-slate-400 border border-slate-100'}`}
                >
                  {i + 1}
                </button>
              )).slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 1))}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-3 border border-slate-200 rounded-xl bg-white hover:text-blue-600 disabled:opacity-20 transition-all cursor-pointer"
            >
              <ChevronRight size={22} />
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
      <AuditJournal />

    </div>
  );
};