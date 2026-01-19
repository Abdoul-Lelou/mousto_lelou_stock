import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/index';
import { AlertTriangle, Package, TrendingUp, DollarSign, Activity, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom'; // Import Link

export const Dashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getData() {
      const { data } = await supabase.from('products').select('*');
      if (data) setProducts(data);
      setLoading(false);
    }
    getData();
  }, []);

  const totalItems = products.reduce((acc, p) => acc + p.quantity, 0);
  const stockValue = products.reduce((acc, p) => acc + (p.quantity * p.unit_price), 0);
  const criticalProducts = products.filter(p => p.quantity <= p.min_threshold);

  if (loading) return (
    <div className="flex h-96 items-center justify-center text-blue-600">
      <Activity className="animate-spin" size={32} />
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
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-500 shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Mis à jour : {new Date().toLocaleTimeString()}
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
        <div className="xl:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Volume de Stock (Top 10)</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={products.sort((a,b) => b.quantity - a.quantity).slice(0, 10)} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
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
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
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