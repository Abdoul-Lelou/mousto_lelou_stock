import { Link, useLocation } from 'react-router-dom'; 
import { LayoutDashboard, Package, ShoppingCart, LogOut, Box, PieChart } from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/' },
  { icon: Package, label: 'Inventaire', path: '/inventory' },
  { icon: ShoppingCart, label: 'Ventes & Caisse', path: '/sales' },
  { icon: PieChart, label: 'Rapports', path: '/reports' },
];

// Typage des props pour accepter onClose (optionnel avec le ?)
interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar = ({ onClose }: SidebarProps) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="flex flex-col h-full text-slate-400 bg-slate-900">
      {/* Brand / Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/50">
            <Box size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">MOUSTO STOCK</span>
        </div>
      </div>

      {/* Menu de Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
          Menu Principal
        </p>
        
        {menuItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link 
              key={item.label} 
              to={item.path} 
              // Ferme la sidebar sur mobile quand on clique sur un lien
              onClick={() => onClose?.()} 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <item.icon size={18} className={`transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pied de page / Déconnexion */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <button className="flex items-center justify-center gap-2 px-4 py-3 w-full text-red-400 hover:bg-red-950/30 hover:text-red-300 rounded-xl transition-all text-sm font-semibold border border-transparent hover:border-red-900/30">
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
};