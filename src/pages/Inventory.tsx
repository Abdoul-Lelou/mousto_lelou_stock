import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { Search, Plus, Edit2, Trash2, X, Filter, Download } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const Inventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, low, out
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  // Filtrage intelligent
  useEffect(() => {
    let res = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterType === 'low') res = res.filter(p => p.quantity > 0 && p.quantity <= p.min_threshold);
    if (filterType === 'out') res = res.filter(p => p.quantity === 0);

    setFilteredProducts(res);
  }, [searchTerm, filterType, products]);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: currentProduct?.name,
      sku: currentProduct?.sku,
      quantity: Number(currentProduct?.quantity),
      unit_price: Number(currentProduct?.unit_price),
      min_threshold: Number(currentProduct?.min_threshold || 5),
    };

    const { error } = currentProduct?.id 
      ? await supabase.from('products').update(payload).eq('id', currentProduct.id)
      : await supabase.from('products').insert([payload]);

    if (!error) {
      toast.success(currentProduct?.id ? "Produit modifié" : "Produit créé avec succès");
      setIsModalOpen(false);
      fetchProducts();
    } else {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    if(confirm("Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.")) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if(!error) {
        toast.success("Produit supprimé");
        fetchProducts();
      }
    }
  };

  return (
    <div className="space-y-6 pb-12 pt-6 px-4">
      <Toaster position="top-right" richColors closeButton />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Inventaire</h1>
           <p className="text-slate-500 text-sm">Gérez votre catalogue et vos stocks.</p>
        </div>
        <div className="flex gap-3">
            
            <button 
                onClick={() => { setCurrentProduct({}); setIsModalOpen(true); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-200"
            >
                <Plus size={18} /> Nouveau Produit
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Rechercher par désignation ou code SKU..."
            className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none rounded-xl text-sm outline-none focus:ring-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
            {['all', 'low', 'out'].map((t) => (
                <button 
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        filterType === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    {t === 'all' ? 'Tous' : t === 'low' ? 'Faible' : 'Rupture'}
                </button>
            ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Désignation</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-right">Statut</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-right">Stock</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-right">Prix Unitaire</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">SKU: {p.sku || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                      p.quantity === 0 ? 'bg-red-50 text-red-700 border-red-100' : 
                      p.quantity <= p.min_threshold ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                      'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      {p.quantity === 0 ? 'Rupture' : p.quantity <= p.min_threshold ? 'Critique' : 'En Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                     <span className="font-mono font-medium text-slate-700">{p.quantity}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{p.unit_price.toLocaleString()} FG</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setCurrentProduct(p); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
            <div className="p-10 text-center text-slate-400 text-sm">Aucun produit trouvé.</div>
        )}
      </div>

      {/* Modal - Formulaire */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                 <h3 className="font-bold text-lg text-slate-900">{currentProduct?.id ? 'Modifier le produit' : 'Nouveau Produit'}</h3>
                 <p className="text-xs text-slate-500">Remplissez les détails ci-dessous.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nom du produit</label>
                    <input required className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium" value={currentProduct?.name || ''} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Code SKU</label>
                    <input className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-blue-500" value={currentProduct?.sku || ''} onChange={e => setCurrentProduct({...currentProduct, sku: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prix (FG)</label>
                    <input required type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-blue-500" value={currentProduct?.unit_price || ''} onChange={e => setCurrentProduct({...currentProduct, unit_price: Number(e.target.value)})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quantité Initiale</label>
                    <input required type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-blue-500" value={currentProduct?.quantity || ''} onChange={e => setCurrentProduct({...currentProduct, quantity: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 text-orange-600">Seuil d'alerte</label>
                    <input required type="number" className="w-full p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm font-mono outline-none focus:border-orange-500 text-orange-800" value={currentProduct?.min_threshold || ''} onChange={e => setCurrentProduct({...currentProduct, min_threshold: Number(e.target.value)})} />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-50 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">Annuler</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};