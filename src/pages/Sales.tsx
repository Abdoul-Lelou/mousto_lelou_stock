import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { ShoppingCart, Search, Trash2, Plus, Minus, CreditCard, X, Printer, CheckCircle2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CartItem extends Product {
  qty: number;
}

export const Sales = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // États pour le Modal et l'impression
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<{items: CartItem[], total: number} | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: p } = await supabase.from('products').select('*').gt('quantity', 0).order('name');
    if(p) setProducts(p);
  };

  // --- LOGIQUE PANIER ---
  const addToCart = (product: Product) => {
    const exists = cart.find(item => item.id === product.id);
    if (exists) {
      if(exists.qty + 1 > product.quantity) return toast.error("Stock insuffisant !");
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (newQty > item.quantity) { toast.error("Stock max atteint"); return item; }
        return { ...item, qty: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.unit_price * item.qty), 0);

  // --- GÉNÉRATION PDF ---
  const generatePDF = (saleItems: CartItem[], total: number) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleString('fr-FR');

    doc.setFontSize(20);
    doc.text("MOUSTO_LELOU - FACTURE", 14, 22);
    doc.setFontSize(10);
    doc.text(`Date: ${date}`, 14, 30);
    doc.text(`Vendeur: Abdourahmane`, 14, 35);

    const tableRows = saleItems.map(item => [
      item.name,
      item.qty.toString(),
      `${item.unit_price.toLocaleString()} FG`,
      `${(item.qty * item.unit_price).toLocaleString()} FG`
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Désignation', 'Qté', 'Prix Unitaire', 'Total']],
      body: tableRows,
      foot: [['', '', 'TOTAL', `${total.toLocaleString()} FG`]],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Facture_${Date.now()}.pdf`);
  };

  // --- PAIEMENT ---
  const handleFinalCheckout = async () => {
    setIsLoading(true);
    try {
      const salesData = cart.map(item => ({
        product_id: item.id,
        quantity: item.qty,
        total_price: item.unit_price * item.qty,
        seller_name: "Abdourahmane"
      }));

      const { error: saleError } = await supabase.from('sales').insert(salesData);
      if (saleError) throw saleError;

      for (const item of cart) {
        await supabase.from('products')
          .update({ quantity: item.quantity - item.qty })
          .eq('id', item.id);
      }

      setLastSaleData({ items: [...cart], total: cartTotal });
      toast.success("Vente validée avec succès !");
      setCart([]);
      setShowConfirmModal(false);
      loadData();
    } catch (e) {
      toast.error("Erreur lors de la transaction");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col lg:flex-row gap-2 h-[calc(50-140px)] relative pt-6 px-4">
      <Toaster position="top-right" richColors />

      {/* GAUCHE: SÉLECTEUR DE PRODUITS */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              autoFocus
              type="text" 
              placeholder="Scanner ou chercher un produit..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
          {filteredProducts.map(product => (
            <button 
              key={product.id}
              onClick={() => addToCart(product)}
              className="flex flex-col items-start p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left group bg-white"
            >
              <div className="font-bold text-slate-900 line-clamp-2 text-sm mb-1">{product.name}</div>
              <div className="text-xs text-slate-500 mb-2 font-mono">Stock: {product.quantity}</div>
              <div className="mt-auto font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-xs group-hover:bg-blue-100 transition-colors">
                {product.unit_price.toLocaleString()} FG
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* DROITE: PANIER & CAISSE */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4">
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2">
              <ShoppingCart size={20} /> Panier Actuel
            </h2>
            <span className="bg-slate-700 px-2 py-1 rounded-lg text-xs font-mono">{cart.length} articles</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <ShoppingCart size={48} className="mb-2" />
                <p className="text-sm">Votre panier est vide</p>
                {lastSaleData && (
                   <button 
                    onClick={() => generatePDF(lastSaleData.items, lastSaleData.total)}
                    className="mt-4 flex items-center gap-2 text-emerald-600 font-bold hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors border border-emerald-100"
                   >
                     <Printer size={16} /> Imprimer Reçu Précédent
                   </button>
                )}
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 font-mono">PU: {item.unit_price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                      <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-white rounded shadow-sm transition"><Minus size={12} /></button>
                      <span className="w-6 text-center text-xs font-bold font-mono">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-white rounded shadow-sm transition"><Plus size={12} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-white border-t border-slate-100 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 text-sm font-medium">Total</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight">{cartTotal.toLocaleString()} FG</span>
            </div>
            <button 
              onClick={() => setShowConfirmModal(true)}
              disabled={cart.length === 0 || isLoading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              <CreditCard size={20} /> Encaisser
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMATION */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Finaliser la vente</h3>
              <p className="text-slate-500 mt-1">Voulez-vous valider cet encaissement de :</p>
              <div className="text-3xl font-black text-blue-600 my-6">{cartTotal.toLocaleString()} FG</div>
              
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={handleFinalCheckout}
                  disabled={isLoading}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? "En cours..." : "Confirmer et Valider"}
                </button>
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                >
                  Retour au panier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};