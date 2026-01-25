import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, LogOut, Box, PieChart, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const menuItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/' },
  { icon: Package, label: 'Inventaire', path: '/inventory' },
  { icon: ShoppingCart, label: 'Ventes & Caisse', path: '/sales' },
  { icon: PieChart, label: 'Rapports', path: '/reports' },
];

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar = ({ onClose }: SidebarProps) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut, role } = useAuth();

  return (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-300 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/10 rounded-b-[3rem] blur-3xl pointer-events-none"></div>

      {/* Brand */}
      <div className="h-24 flex items-center px-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl shadow-xl shadow-blue-500/20">
            <Box size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter leading-none">LELOU</h1>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Stock Manager</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto relative z-10 scrollbar-hide">
        <div className="px-4 mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Menu Principal</span>
        </div>

        {menuItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => onClose?.()}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-300 group relative overflow-hidden ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30 translate-x-1'
                  : 'hover:bg-slate-800/50 hover:text-white'
                }`}
            >
              <item.icon size={20} className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="relative z-10">{item.label}</span>
              {isActive && <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>}
            </Link>
          );
        })}

        {role === 'admin' && (
          <div className="pt-6">
            <div className="px-4 mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Système</span>
            </div>
            <Link
              to="/admin"
              onClick={() => onClose?.()}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-300 group ${currentPath === '/admin'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30 translate-x-1'
                  : 'hover:bg-slate-800/50 hover:text-white'
                }`}
            >
              <Shield size={20} className="transition-transform group-hover:scale-110" />
              <span>Administration</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Footer / Logout */}
      <div className="p-6 relative z-10">
        <div className="p-4 rounded-3xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
          <button
            onClick={() => signOut()}
            className="flex items-center justify-center gap-3 w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all text-xs font-bold uppercase tracking-wider group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </div>
  );
};