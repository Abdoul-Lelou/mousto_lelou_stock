import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Bell, User, Menu, X, LogOut, Settings, Package, ShoppingBag, Check, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/useNotifications';

export const Shell = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const location = useLocation();
  const isSalesPage = location.pathname === '/sales';
  const { profile, role, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <div className="flex h-screen bg-[#F1F5F9] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">

      {/* --- SIDEBAR MOBILE --- */}
      <div className={`fixed inset-0 z-[60] lg:hidden ${isSidebarOpen ? "block" : "hidden"}`}>
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        <aside className={`absolute inset-y-0 left-0 w-72 bg-slate-900 shadow-2xl transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex justify-end p-4">
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-800 text-white rounded-lg"><X size={20} /></button>
          </div>
          <div className="h-full -mt-16">
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
          </div>
        </aside>
      </div>

      {/* --- SIDEBAR DESKTOP --- */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-900 z-20 shadow-xl">
        <Sidebar />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-slate-900">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shadow-sm">

          <div className="flex items-center gap-4 flex-1">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700">
                <Menu size={24} />
              </button>
            )}
            <div className="relative w-full max-w-md hidden md:block">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">MOUSTO_LELOU</h4>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* THEME SWITCH */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title={isDark ? "Mode Clair" : "Mode Sombre"}
            >
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>

            {/* NOTIFICATIONS */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`p-2 rounded-full relative transition-all ${isNotifOpen ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                  <div className="absolute top-12 right-0 w-80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-800/50">
                      <p className="font-black text-[10px] text-slate-800 dark:text-slate-200 uppercase tracking-widest">Notifications</p>
                      {unreadCount > 0 && (
                        <button onClick={() => markAllAsRead()} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700">Tout lire</button>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center opacity-40">
                          <Bell size={32} className="mb-2 text-slate-300" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aucune alerte</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-700">
                          {notifications.slice(0, 5).map((n) => (
                            <div key={n.id} onClick={() => { if (!n.is_read) markAsRead(n.id); }} className={`p-3 m-2 rounded-[1rem] transition-all cursor-pointer flex gap-3 hover:bg-white/60 dark:hover:bg-slate-700/60 ${!n.is_read ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''}`}>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'low_stock' || n.type === 'warning' ? 'bg-orange-100 text-orange-600' : n.type === 'sale' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                {n.type === 'low_stock' || n.type === 'warning' ? <Package size={16} /> : n.type === 'sale' ? <ShoppingBag size={16} /> : <Check size={16} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[11px] font-black uppercase truncate ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{n.title}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">{n.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-slate-100 dark:border-slate-800 relative group">
              <button className="flex items-center gap-2 p-1 pr-2 rounded-full transition-all">
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                  <span className="font-black text-xs">{profile?.full_name?.charAt(0).toUpperCase() || <User size={16} />}</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none">{profile?.full_name || 'Utilisateur'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{role}</p>
                </div>
              </button>
              <div className="absolute top-12 right-0 w-56 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-2 hidden group-hover:block hover:block animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  <Settings size={16} /> Profil
                </Link>
                <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors text-left">
                  <LogOut size={16} /> Déconnexion
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto scroll-smooth ${isSalesPage ? 'p-0' : 'p-4 md:p-6'}`}>
          <div className="w-full h-full text-slate-900 dark:text-slate-100">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};