import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/index';
import { AlertTriangle, Package, TrendingUp, DollarSign, Activity, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { Link } from 'react-router-dom';
import { toast, Toaster } from 'sonner';

export const Dashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);

  useEffect(() => {
    async function getData() {
      const [prodRes, salesRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_archived', false).order('name'),
        supabase.from('sales').select('total_price, created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      if (prodRes.data) setProducts(prodRes.data);

      if (salesRes.data) {
        // Grouper par jour
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toLocaleDateString('fr-FR', { weekday: 'short' });
        });

        const grouping: Record<string, number> = {};
        salesRes.data.forEach(s => {
          const day = new Date(s.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
          grouping[day] = (grouping[day] || 0) + s.total_price;
        });

        setSalesHistory(days.map(d => ({ name: d, total: grouping[d] || 0 })));
      }

      setLoading(false);
    }
    getData();
  }, []);



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
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Tableau de Bord</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Aperçu en temps réel de votre activité.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500 dark:text-slate-400 shadow-sm flex items-center gap-2 hidden sm:flex">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {new Date().toLocaleTimeString()}
          </div>
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
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase text-xs tracking-widest text-slate-400">Évolution des Ventes</h3>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">7 derniers jours</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase">
                <Activity size={12} /> Live
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesHistory}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="opacity-10" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px', background: '#1e293b' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase text-xs tracking-widest text-slate-400">Volume de Stock (Top 10)</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={products.sort((a, b) => b.quantity - a.quantity).slice(0, 10)} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="opacity-10" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="quantity" radius={[6, 6, 0, 0]}>
                    {products.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.quantity <= entry.min_threshold ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase text-xs tracking-widest text-slate-400">
              <AlertTriangle size={18} className="text-orange-500" /> Priorités
            </h3>
            <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">{criticalProducts.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1 font-sans">
            {criticalProducts.map(p => (
              <Link to="/inventory" key={p.id} className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-all group">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">SEUIL: {p.min_threshold}</p>
                </div>
                <span className={`text-lg font-bold font-mono ${p.quantity === 0 ? 'text-red-600' : 'text-orange-500'}`}>{p.quantity}</span>
              </Link>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-700">
            <Link to="/inventory" className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors flex items-center justify-center gap-2 uppercase tracking-wide">
              Voir l'inventaire complet <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
};

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  trend?: string;
  isNegative?: boolean;
  theme: 'blue' | 'orange' | 'red' | 'emerald';
}

const KpiCard = ({ icon, label, value, sub, trend, isNegative, theme }: KpiCardProps) => {
  const colors: Record<string, string> = {
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