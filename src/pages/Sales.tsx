import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { ShoppingCart, Search, Trash2, Plus, Minus, CreditCard, CheckCircle2, Edit2, Printer, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/useNotifications';

interface CartItem extends Product {
  qty: number;
}

export const Sales = () => {
  const { profile } = useAuth();
  const { notifyAdmins } = useNotifications();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<{ items: CartItem[], total: number, transactionId: string } | null>(null);

  useEffect(() => { loadData(); }, []);

  const [priceModalData, setPriceModalData] = useState<{ id: string, currentPrice: number } | null>(null);
  const [newPriceInputValue, setNewPriceInputValue] = useState('');

  const loadData = async () => {
    const { data: p } = await supabase.from('products').select('*').gt('quantity', 0).order('name');
    if (p) setProducts(p);
  };

  const addToCart = (product: Product) => {
    const exists = cart.find(item => item.id === product.id);
    if (exists) {
      if (exists.qty + 1 > product.quantity) return toast.error("Stock insuffisant !");
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
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

  const openPriceModal = (id: string, currentPrice: number) => {
    setPriceModalData({ id, currentPrice });
    setNewPriceInputValue(currentPrice.toString());
  };

  const handlePriceUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceModalData) return;

    const newPrice = Number(newPriceInputValue);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Prix invalide");
      return;
    }

    setCart(cart.map(i => i.id === priceModalData.id ? { ...i, unit_price: newPrice } : i));
    toast.success("Prix mis à jour");
    setPriceModalData(null);
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.unit_price * item.qty), 0);

  const generatePDF = (saleItems: CartItem[], total: number, transactionId: string) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("MOUSTO_LELOU - REÇU DE VENTE", 14, 20);
    doc.setFontSize(10);
    doc.text(`N° Transaction: ${transactionId.substring(0, 8).toUpperCase()}`, 14, 25);
    doc.text(`Date: ${new Date().toLocaleString('fr-FR')}`, 14, 32);
    doc.text(`Vendeur: ${profile?.firstname} ${profile?.lastname}`, 14, 37);

    autoTable(doc, {
      startY: 40,
      head: [['Désignation', 'Qté', 'PU', 'Total']],
      body: saleItems.map(i => [i.name, i.qty, `${i.unit_price.toLocaleString()} FG`, `${(i.qty * i.unit_price).toLocaleString()} FG`]),
      foot: [['', '', 'TOTAL', `${total.toLocaleString()} FG`]],
      theme: 'grid'
    });

    // Pied de page officiel
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Document généré par le système - MOUSTO_LELOU", 105, pageHeight - 10, { align: 'center' });

    doc.save(`Recu_${transactionId.substring(0, 8).toUpperCase()}.pdf`);
  };

  // Checkout processing
  const handleFinalCheckout = async () => {
    setIsLoading(true);
    try {
      const currentCart = [...cart];
      const currentTotal = cartTotal;

      const salesData = currentCart.map(item => ({
        product_id: item.id,
        quantity: item.qty,
        total_price: item.unit_price * item.qty,
        seller_name: `${profile?.firstname} ${profile?.lastname}`,
        created_by: profile?.id
      }));

      const { data: insertedSales, error: saleError } = await supabase.from('sales').insert(salesData).select();
      if (saleError) throw saleError;

      const realTransactionId = insertedSales?.[0]?.id || 'UNKNOWN';

      const movementsData = currentCart.map(item => ({
        product_id: item.id,
        type: 'out',
        quantity: item.qty,
        reason: 'Vente',
        created_by: profile?.id
      }));

      const { error: movementError } = await supabase.from('stock_movements').insert(movementsData);
      if (movementError) {
        toast.warning("Vente enregistrée mais historique non synchronisé");
      }

      for (const item of currentCart) {
        const newQty = item.quantity - item.qty;
        await supabase.from('products')
          .update({ quantity: newQty })
          .eq('id', item.id);

        if (newQty <= item.min_threshold) {
          notifyAdmins(
            "⚠️ Alerte Stock Critique",
            `Après une vente, le stock de "${item.name}" est tombé à ${newQty} unités.`,
            "low_stock"
          );
        }
      }

      if (currentTotal >= 1000000) {
        notifyAdmins(
          "💰 Vente Importante !",
          `Une vente de ${currentTotal.toLocaleString()} FG a été réalisée par ${profile?.firstname} ${profile?.lastname}.`,
          "sale"
        );
      }

      setLastSaleData({
        items: currentCart,
        total: currentTotal,
        transactionId: realTransactionId
      });

      generatePDF(currentCart, currentTotal, realTransactionId);

      toast.success("Vente enregistrée !");
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
    <div className="max-w-7xl mx-auto pt-6 pb-10 px-4 md:px-8 space-y-6 animate-in fade-in duration-500">
      <Toaster position="top-right" richColors />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Caisse</h1>
        <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs uppercase tracking-widest">
          Connecté: {profile?.firstname} {profile?.lastname}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LISTE PRODUITS */}
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[650px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Scanner ou chercher un produit..."
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-3 content-start font-sans">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex flex-col items-start p-4 rounded-2xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left group bg-white"
              >
                <div className="font-bold text-slate-800 line-clamp-2 text-sm mb-1">{product.name}</div>
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Stock: {product.quantity}</div>
                <div className="mt-3 font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {product.unit_price.toLocaleString()} FG
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* PANIER / CAISSE */}
        <div className="w-full lg:w-[400px] flex flex-col h-[650px]">
          <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2 uppercase text-xs tracking-widest">
                <ShoppingCart size={18} className="text-blue-400" /> Panier Actuel
              </h2>
              <span className="bg-blue-600 px-2 py-1 rounded-lg text-[10px] font-mono">{cart.length} Articles</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                  <ShoppingCart size={48} className="mb-2" />
                  <p className="text-xs font-black uppercase tracking-widest">Votre panier est vide</p>
                  {lastSaleData && (
                    <button
                      onClick={() => generatePDF(lastSaleData.items, lastSaleData.total, lastSaleData.transactionId)}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 transition-all"
                    >
                      <Printer size={14} /> Réimprimer dernier reçu
                    </button>
                  )}
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                      <button
                        onClick={() => openPriceModal(item.id, item.unit_price)}
                        className="flex items-center gap-1 text-[10px] text-blue-600 font-mono font-bold hover:bg-blue-50 px-1 rounded transition-colors"
                      >
                        <Edit2 size={10} /> {item.unit_price.toLocaleString()} FG
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-white rounded transition-all"><Minus size={12} /></button>
                        <span className="w-6 text-center text-xs font-black font-mono">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-white rounded transition-all"><Plus size={12} /></button>
                      </div>
                      <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-white border-t border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <span className="text-slate-400 text-xs font-black uppercase tracking-widest">Total</span>
                <span className="text-3xl font-mono font-black text-slate-900 tracking-tight">{cartTotal.toLocaleString()} FG</span>
              </div>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={cart.length === 0 || isLoading}
                className={`w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 ${isLoading ? 'cursor-wait' : 'cursor-pointer hover:scale-[1.02]'}`}
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><CreditCard size={20} /> Encaisser</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase">Finaliser la vente ?</h3>
              <p className="text-slate-500 mt-2 text-sm font-medium">Voulez-vous valider cet encaissement de :</p>
              <div className="text-4xl font-mono font-black text-blue-600 my-6 tracking-tighter">{cartTotal.toLocaleString()} FG</div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleFinalCheckout}
                  disabled={isLoading}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  {isLoading ? "Veuillez patienter..." : "Confirmer"}
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  Retour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION PRIX */}
      {priceModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Modifier le prix</h3>
              <button onClick={() => setPriceModalData(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><Trash2 size={16} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handlePriceUpdate} className="p-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nouveau Prix (FG)</label>
              <input
                type="number"
                min="0"
                className="w-full p-4 bg-slate-50 border-none rounded-xl font-mono font-bold text-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 mb-6"
                value={newPriceInputValue}
                onChange={e => setNewPriceInputValue(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setPriceModalData(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Annuler</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};