import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { History, Package, Search, Printer, ChevronLeft, ChevronRight, X, Calendar, User, Tag, Info } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Reports = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<any | null>(null); // État pour le modal
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        quantity,
        total_price,
        seller_name,
        created_at,
        product_id,
        products ( name, unit_price )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
    } else {
      setSales(data || []);
    }
    setLoading(false);
  };

  const printSingleInvoice = (sale: any) => {
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
        sale.products?.name,
        sale.quantity,
        `${(sale.total_price / sale.quantity).toLocaleString()} FG`,
        `${sale.total_price.toLocaleString()} FG`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] }
    });

    doc.save(`Vente_${sale.products?.name}_${sale.id.split('-')[0]}.pdf`);
  };

  const filteredSales = sales.filter(sale => 
    sale.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.seller_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem);
  const totalRevenue = filteredSales.reduce((acc, sale) => acc + sale.total_price, 0);

  return (
    <div className="pt-6 px-4">
      <Toaster position="top-right" richColors />
      
      {/* Header Statistique */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-sans tracking-tight">Historique des Ventes</h1>
          <p className="text-slate-500 text-sm font-medium">Suivi détaillé de l'activité commerciale.</p>
        </div>
        <div className="bg-slate-900 px-6 py-4 rounded-2xl text-white shadow-xl flex flex-col items-end">
          <p className="text-[10px] opacity-60 uppercase font-black tracking-widest mb-1">Chiffre d'Affaire Total</p>
          <p className="text-2xl font-mono font-bold text-blue-400">{totalRevenue.toLocaleString()} <span className="text-xs">FG</span></p>
        </div>
      </div>

      {/* Barre d'outils */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Rechercher par produit ou vendeur..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <button onClick={fetchSales} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
          <History size={20} className="text-slate-600" />
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase">Date & Heure</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase">Article</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase text-center">Quantité</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase text-right">Total</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-20 animate-pulse text-slate-400">Chargement...</td></tr>
              ) : currentItems.map((sale) => (
                <tr 
                  key={sale.id} 
                  onClick={() => setSelectedSale(sale)} // Clic sur la ligne pour voir les détails
                  className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{new Date(sale.created_at).toLocaleDateString()}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Package size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{sale.products?.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Vendeur: {sale.seller_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-slate-100 rounded-full font-mono font-bold text-slate-600">x{sale.quantity}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                    {sale.total_price.toLocaleString()} <span className="text-[10px] text-slate-400">FG</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); // Empêche l'ouverture du modal de détails lors du clic sur imprimer
                        printSingleInvoice(sale);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                    >
                      <Printer size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-6 bg-slate-50/50 border-t border-slate-200 flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-30 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
                {[...Array(totalPages)].map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-white text-slate-400 border border-transparent hover:border-slate-200'}`}
                    >
                        {i + 1}
                    </button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-30 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE DÉTAILS DE LA VENTE */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2 text-slate-800">
                <Info size={20} className="text-blue-600" />
                <h3 className="font-bold text-lg">Détails de la transaction</h3>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-white rounded-full transition-colors cursor-pointer text-slate-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>

            {/* Corps Modal */}
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Article</p>
                  <p className="text-xl font-bold text-slate-900">{selectedSale.products?.name}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Total</p>
                   <p className="text-xl font-black text-blue-600">{selectedSale.total_price.toLocaleString()} FG</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Tag size={14} />
                    <span className="text-[10px] font-bold uppercase">Quantité</span>
                  </div>
                  <p className="font-bold text-slate-700">x {selectedSale.quantity}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <User size={14} />
                    <span className="text-[10px] font-bold uppercase">Vendeur</span>
                  </div>
                  <p className="font-bold text-slate-700">{selectedSale.seller_name}</p>
                </div>
              </div>

              <div className="p-4 border border-slate-100 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Calendar size={20} />
                </div>
                <div>
                   <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Date de vente</p>
                   <p className="text-sm font-bold text-slate-700">
                     Le {new Date(selectedSale.created_at).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                   </p>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => {
                  printSingleInvoice(selectedSale);
                  setSelectedSale(null);
                }}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all cursor-pointer shadow-lg shadow-blue-100"
              >
                <Printer size={18} /> Imprimer le reçu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};