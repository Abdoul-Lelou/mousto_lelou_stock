import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { Search, Plus, Edit2, Trash2, X, Package, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/useNotifications';

export const Inventory = () => {
  const { session, role } = useAuth();
  const { notifyAdmins } = useNotifications();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestocking, setIsRestocking] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQuantity, setRestockQuantity] = useState(0);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (role === 'vendeur' && (isModalOpen || isRestockModalOpen)) {
      toast.error("Accès refusé : Opération réservée aux administrateurs");
      setIsModalOpen(false);
      setIsRestockModalOpen(false);
    }
  }, [role, isModalOpen, isRestockModalOpen]);

  useEffect(() => {
    let res = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterType === 'low') res = res.filter(p => p.quantity > 0 && p.quantity <= p.min_threshold);
    if (filterType === 'out') res = res.filter(p => p.quantity === 0);
    setFilteredProducts(res);
  }, [searchTerm, filterType, products]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const quantity = Number(currentProduct?.quantity);
    if (quantity < 0) {
      toast.error("Stock invalide", { description: "La quantité ne peut pas être négative." });
      return;
    }

    const payload = {
      ...currentProduct,
      quantity,
      unit_price: Number(currentProduct?.unit_price),
      min_threshold: Number(currentProduct?.min_threshold)
    };

    setIsSaving(true);
    try {
      if (currentProduct?.id) {
        // MODIFICATION
        const oldProduct = products.find(p => p.id === currentProduct.id);
        const oldQty = oldProduct?.quantity || 0;
        const diff = quantity - oldQty;

        const { error: updateError } = await supabase.from('products').update(payload).eq('id', currentProduct.id);
        if (updateError) throw updateError;

        if (diff !== 0) {
          await supabase.from('stock_movements').insert([{
            product_id: currentProduct.id,
            type: diff > 0 ? 'in' : 'out',
            quantity: Math.abs(diff),
            reason: diff > 0 ? 'Ajustement manuel (Augmentation)' : 'Ajustement manuel (Diminution)',
            created_by: session?.user?.id
          }]);
        }
        toast.success("Produit modifié");
      } else {
        // CRÉATION
        // Vérifier doublons
        const { data: dupName } = await supabase.from('products').select('id').ilike('name', currentProduct?.name || '').limit(1);
        if (dupName && dupName.length > 0) return toast.error("Ce nom de produit existe déjà");

        if (currentProduct?.sku) {
          const { data: dupSku } = await supabase.from('products').select('id').eq('sku', currentProduct.sku).limit(1);
          if (dupSku && dupSku.length > 0) return toast.error("Ce code SKU existe déjà");
        }

        const { data: newProduct, error: insertError } = await supabase.from('products').insert([payload]).select().single();
        if (insertError) throw insertError;

        if (quantity > 0) {
          await supabase.from('stock_movements').insert([{
            product_id: newProduct.id,
            type: 'in',
            quantity: quantity,
            reason: 'Stock initial',
            created_by: session?.user?.id
          }]);
        }
      }
      toast.success(currentProduct?.id ? "Produit modifié" : "Produit créé");

      // ALERT TRIGGER : Stock faible
      if (quantity <= Number(currentProduct?.min_threshold)) {
        notifyAdmins(
          "⚠️ Stock Faible Détecté",
          `Le produit "${currentProduct?.name}" est en dessous de son seuil d'alerte (${quantity} unités restantes).`,
          "low_stock"
        );
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct || restockQuantity <= 0) return;

    setIsRestocking(true);
    try {
      const newQuantity = restockProduct.quantity + restockQuantity;
      const { error: updateError } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', restockProduct.id);
      if (updateError) throw updateError;

      await supabase.from('stock_movements').insert([{
        product_id: restockProduct.id,
        type: 'in',
        quantity: restockQuantity,
        reason: 'Réapprovisionnement',
        created_by: session?.user?.id
      }]);

      toast.success(`+${restockQuantity} unités ajoutées`);

      // ALERT TRIGGER : Stock faible (si on restock mais que c'est toujours bas...)
      if (newQuantity <= restockProduct.min_threshold) {
        notifyAdmins(
          "⚠️ Stock Toujours Bas",
          `Malgré le réapprovisionnement, "${restockProduct.name}" reste en stock critique (${newQuantity} unités).`,
          "low_stock"
        );
      }

      setIsRestockModalOpen(false);
      setRestockQuantity(0);
      fetchProducts();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    } finally {
      setIsRestocking(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer ce produit ?")) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
        toast.success("Produit supprimé");
        fetchProducts();
      } else {
        toast.error("Erreur (ce produit a peut-être des ventes liées)");
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12 pt-6 space-y-8 animate-in fade-in duration-500">
      <Toaster position="top-right" richColors />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Inventaire</h1>
          <p className="text-slate-500 font-medium">Gestion du catalogue et des stocks.</p>
        </div>
        {role === 'admin' && (
          <button onClick={() => { setCurrentProduct({}); setIsModalOpen(true); }} className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-blue-200">
            <Plus size={20} /> Nouveau Produit
          </button>
        )}
      </div>

      <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Recherche..." className="w-full pl-12 pr-4 py-3.5 bg-transparent outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          {['all', 'low', 'out'].map((t) => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterType === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t === 'all' ? 'Tous' : t === 'low' ? 'Critique' : 'Rupture'}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <p className="text-sm font-medium">Récupération du stock...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Désignation</th>
                  <th className="px-6 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right">Statut</th>
                  <th className="px-6 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right">Stock</th>
                  <th className="px-6 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right">Prix Unit</th>
                  <th className="px-6 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                          <Package className="text-slate-300" size={40} />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-700 mb-1">Aucun produit</p>
                          <p className="text-sm text-slate-400">Cliquez sur 'Nouveau Produit' pour commencer.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Package size={18} /></div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-base">{p.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">SKU: {p.sku || '---'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${p.quantity === 0 ? 'bg-red-50 text-red-700 border-red-100' : p.quantity <= p.min_threshold ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{p.quantity === 0 ? 'Rupture' : p.quantity <= p.min_threshold ? 'Critique' : 'Ok'}</span>
                      </td>
                      <td className="px-6 py-5 text-right font-mono font-bold text-slate-700">{p.quantity}</td>
                      <td className="px-6 py-5 text-right font-mono font-bold text-slate-900">{p.unit_price.toLocaleString()} FG</td>
                      <td className="px-6 py-5 text-center space-x-1">
                        {role === 'admin' ? (
                          <>
                            <button onClick={() => { setRestockProduct(p); setIsRestockModalOpen(true); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-xl transition-all" title="Réapprovisionner"><Plus size={18} /></button>
                            <button onClick={() => { setCurrentProduct(p); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all"><Edit2 size={18} /></button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all"><Trash2 size={18} /></button>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consultation</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">{currentProduct?.id ? 'Modifier' : 'Nouveau Produit'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-200 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-4">
                <input required placeholder="Nom du produit" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 placeholder:text-slate-400" value={currentProduct?.name || ''} onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Code SKU" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-mono text-slate-800" value={currentProduct?.sku || ''} onChange={e => setCurrentProduct({ ...currentProduct, sku: e.target.value })} />
                  <input required type="number" placeholder="Prix Unit (FG)" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-mono text-slate-800" value={currentProduct?.unit_price || ''} onChange={e => setCurrentProduct({ ...currentProduct, unit_price: Number(e.target.value) })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input required type="number" placeholder="Stock Initial" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-mono text-slate-800" value={currentProduct?.quantity || ''} onChange={e => setCurrentProduct({ ...currentProduct, quantity: Number(e.target.value) })} />
                  <input required type="number" placeholder="Seuil Alerte" className="w-full p-4 bg-orange-50 border-none rounded-2xl font-mono text-orange-700" value={currentProduct?.min_threshold || ''} onChange={e => setCurrentProduct({ ...currentProduct, min_threshold: Number(e.target.value) })} />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className={`w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 ${isSaving ? 'cursor-wait opacity-70' : 'cursor-pointer hover:scale-[1.02]'}`}
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Enregistrer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isRestockModalOpen && restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-emerald-100 flex justify-between items-center bg-emerald-50/50">
              <div>
                <h3 className="font-black text-xl text-emerald-900 uppercase tracking-tight">Réapprovisionner</h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">{restockProduct.name}</p>
              </div>
              <button onClick={() => setIsRestockModalOpen(false)} className="p-2 bg-emerald-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-all text-emerald-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleRestock} className="p-8 space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Stock Actuel</p>
                <p className="text-3xl font-mono font-black text-slate-800">{restockProduct.quantity} <span className="text-sm font-bold text-slate-400 ml-1">unités</span></p>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Quantité à ajouter</label>
                <input required type="number" min="1" className="w-full p-5 bg-emerald-50 border-2 border-emerald-200 rounded-2xl font-mono font-black text-3xl text-emerald-700 outline-none" value={restockQuantity || ''} onChange={e => setRestockQuantity(Number(e.target.value))} autoFocus />
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-2">Nouveau Stock Estimé</p>
                <p className="text-3xl font-mono font-black text-blue-700">{restockProduct.quantity + (restockQuantity || 0)} <span className="text-sm font-bold text-blue-400 ml-1">unités</span></p>
              </div>
              <button
                type="submit"
                disabled={isRestocking}
                className={`w-full py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 ${isRestocking ? 'cursor-wait opacity-70' : 'cursor-pointer hover:scale-[1.02]'}`}
              >
                {isRestocking ? <Loader2 className="animate-spin" size={20} /> : 'Confirmer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};