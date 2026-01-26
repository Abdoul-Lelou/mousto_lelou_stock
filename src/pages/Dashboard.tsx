import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/index';
import { AlertTriangle, Package, TrendingUp, DollarSign, Activity, ChevronRight, Plus, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { toast, Toaster } from 'sonner';

export const Dashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});

  useEffect(() => {
    async function getData() {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (data) setProducts(data);
      setLoading(false);
    }
    getData();
  }, [loading]); // Add loading dependency to refresh when loading state changes (triggered by save)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = Number(currentProduct?.quantity);
    const unitPrice = Number(currentProduct?.unit_price);
    const minThreshold = Number(currentProduct?.min_threshold);

    if (quantity < 0 || unitPrice < 0) {
      toast.error("Valeurs invalides");
      return;
    }

    try {
      // Duplicate checks
      const { data: dupName } = await supabase.from('products').select('id').ilike('name', currentProduct?.name || '').limit(1);
      if (dupName && dupName.length > 0) throw new Error("Ce nom de produit existe déjà");

      const { data: newProduct, error: insertError } = await supabase.from('products').insert([{
        ...currentProduct,
        quantity,
        unit_price: unitPrice,
        min_threshold: minThreshold
      }]).select().single();

      if (insertError) throw insertError;

      if (quantity > 0) {
        await supabase.from('stock_movements').insert([{
          product_id: newProduct.id,
          type: 'in',
          quantity: quantity,
          reason: 'Stock initial (Dashboard)',
          created_by: (await supabase.auth.getSession()).data.session?.user?.id
        }]);
      }

      toast.success("Produit ajouté avec succès");
      setIsModalOpen(false);
      setCurrentProduct({});
      setLoading(true);
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
    }
  };

  const totalItems = products.reduce((acc, p) => acc + p.quantity, 0);
  const stockValue = products.reduce((acc, p) => acc + (p.quantity * p.unit_price), 0);
  const criticalProducts = products.filter(p => p.quantity <= p.min_threshold);

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center gap-4 bg-[#F8FAFC]">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Activity className="text-blue-600" size={24} />
        </div>
      </div>
      <p className="text-sm font-bold text-slate-400 animate-pulse">Chargement du tableau de bord...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12 pt-6 space-y-8 animate-in fade-in duration-500">

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Tableau de Bord</h1>
          <p className="text-slate-500 mt-1 font-medium">Aperçu en temps réel de votre activité.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-500 shadow-sm flex items-center gap-2 hidden sm:flex">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {new Date().toLocaleTimeString()}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-slate-200 transition-all text-[10px] uppercase tracking-widest"
          >
            <Plus size={18} /> Ajouter
          </button>
        </div>
      </div>

      {/* KPI Cards - Now Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link to="/inventory">
          <KpiCard icon={<Package size={24} />} label="Stock Total" value={totalItems.toLocaleString()} sub="Unités" theme="blue" />
        </Link>
        <Link to="/inventory">
          <KpiCard icon={<AlertTriangle size={24} />} label="Niveau Critique" value={criticalProducts.length} trend="Action" isNegative theme="orange" />
        </Link>
        <Link to="/inventory">
          <KpiCard icon={<TrendingUp size={24} />} label="En Rupture" value={products.filter(p => p.quantity === 0).length} theme="red" />
        </Link>
        <Link to="/reports">
          <KpiCard icon={<DollarSign size={24} />} label="Valeur Totale" value={`${(stockValue / 1000000).toFixed(1)}M`} sub="FG" theme="emerald" />
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 uppercase text-xs tracking-widest text-slate-400">Volume de Stock (Top 10)</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={products.sort((a, b) => b.quantity - a.quantity).slice(0, 10)} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="quantity" radius={[6, 6, 0, 0]}>
                  {products.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.quantity <= entry.min_threshold ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest text-slate-400">
              <AlertTriangle size={18} className="text-orange-500" /> Priorités
            </h3>
            <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">{criticalProducts.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1">
            {criticalProducts.map(p => (
              <Link to="/inventory" key={p.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-all group">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">SEUIL: {p.min_threshold}</p>
                </div>
                <span className={`text-lg font-bold font-mono ${p.quantity === 0 ? 'text-red-600' : 'text-orange-500'}`}>{p.quantity}</span>
              </Link>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100">
            <Link to="/inventory" className="w-full py-3 text-sm text-blue-600 font-bold hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-center gap-2">
              Voir l'inventaire complet <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <Toaster position="top-right" richColors />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Nouveau Produit</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-200 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-4">
                <input required placeholder="Nom du produit" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" value={currentProduct?.name || ''} onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Code SKU" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-mono" value={currentProduct?.sku || ''} onChange={e => setCurrentProduct({ ...currentProduct, sku: e.target.value })} />
                  <input required type="number" placeholder="Prix Unit (FG)" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-mono" value={currentProduct?.unit_price || ''} onChange={e => setCurrentProduct({ ...currentProduct, unit_price: Number(e.target.value) })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input required type="number" placeholder="Stock Initial" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-mono" value={currentProduct?.quantity || ''} onChange={e => setCurrentProduct({ ...currentProduct, quantity: Number(e.target.value) })} />
                  <input required type="number" placeholder="Seuil Alerte" className="w-full p-4 bg-orange-50 border-none rounded-2xl font-mono text-orange-700" value={currentProduct?.min_threshold || ''} onChange={e => setCurrentProduct({ ...currentProduct, min_threshold: Number(e.target.value) })} />
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

const KpiCard = ({ icon, label, value, sub, trend, isNegative, theme }: any) => {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red: "bg-red-50 text-red-600 border-red-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
  };
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl border ${colors[theme]} group-hover:scale-110 transition-transform`}>{icon}</div>
        {trend && <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${isNegative ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{trend}</span>}
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <h3 className="text-2xl font-black text-slate-900 font-mono">{value}</h3>
        {sub && <span className="text-[10px] text-slate-400 font-bold uppercase">{sub}</span>}
      </div>
    </div>
  );
};