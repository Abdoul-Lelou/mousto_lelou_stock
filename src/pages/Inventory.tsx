import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { Search, Plus, Edit2, Trash2, X, Package } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const Inventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    let res = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
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
    const payload = { ...currentProduct, quantity: Number(currentProduct?.quantity), unit_price: Number(currentProduct?.unit_price), min_threshold: Number(currentProduct?.min_threshold) };
    const { error } = currentProduct?.id ? await supabase.from('products').update(payload).eq('id', currentProduct.id) : await supabase.from('products').insert([payload]);
    if (!error) { toast.success("Succès"); setIsModalOpen(false); fetchProducts(); }
  };

  const handleDelete = async (id: string) => {
    if(confirm("Supprimer ?")) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if(!error) { toast.success("Supprimé"); fetchProducts(); }
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
        <button onClick={() => { setCurrentProduct({}); setIsModalOpen(true); }} className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-blue-200">
            <Plus size={20} /> Nouveau Produit
        </button>
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
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Package size={18}/></div>
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
                      <button onClick={() => { setCurrentProduct(p); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all"><Edit2 size={18}/></button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">{currentProduct?.id ? 'Modifier' : 'Nouveau Produit'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-200 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-4">
                <input required placeholder="Nom du produit" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" value={currentProduct?.name || ''} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Code SKU" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-mono" value={currentProduct?.sku || ''} onChange={e => setCurrentProduct({...currentProduct, sku: e.target.value})} />
                  <input required type="number" placeholder="Prix Unit (FG)" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-mono" value={currentProduct?.unit_price || ''} onChange={e => setCurrentProduct({...currentProduct, unit_price: Number(e.target.value)})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input required type="number" placeholder="Stock Initial" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-mono" value={currentProduct?.quantity || ''} onChange={e => setCurrentProduct({...currentProduct, quantity: Number(e.target.value)})} />
                  <input required type="number" placeholder="Seuil Alerte" className="w-full p-4 bg-orange-50 border-none rounded-2xl font-mono text-orange-700" value={currentProduct?.min_threshold || ''} onChange={e => setCurrentProduct({...currentProduct, min_threshold: Number(e.target.value)})} />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest">Enregistrer</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};