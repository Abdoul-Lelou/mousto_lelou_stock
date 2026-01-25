import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Bell, User, Menu, X, LogOut, Settings, Package, ShoppingBag, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/useNotifications';

export const Shell = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const location = useLocation();
  const isSalesPage = location.pathname === '/sales';
  const { profile, role, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="flex h-screen bg-[#F1F5F9] font-sans text-slate-900 overflow-hidden">

      {/* --- SIDEBAR MOBILE (Uniquement si isSidebarOpen est vrai) --- */}
      <div className={`fixed inset-0 z-[60] lg:hidden ${isSidebarOpen ? "block" : "hidden"}`}>
        {/* Fond sombre */}
        <div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Contenu de la Sidebar Mobile */}
        <aside className={`absolute inset-y-0 left-0 w-72 bg-slate-900 shadow-2xl transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          {/* Bouton de fermeture déplacé à l'intérieur pour éviter les bugs */}
          <div className="flex justify-end p-4">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 bg-slate-800 text-white rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="h-full -mt-16"> {/* On remonte pour compenser le bouton X */}
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
          </div>
        </aside>
      </div>

      {/* --- SIDEBAR DESKTOP --- */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 border-r border-slate-200 bg-slate-900 z-20 shadow-xl">
        <Sidebar />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shadow-sm">

          <div className="flex items-center gap-4 flex-1">
            {/* Bouton Menu Hamburger - Maintenant bien visible */}
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              >
                <Menu size={24} />
              </button>
            )}

            <div className="relative w-full max-w-md hidden md:block">
              <h4 className="text-sm font-bold text-slate-800 tracking-tight">MOUSTO_LELOU</h4>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* NOTIFICATIONS */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`p-2 rounded-full relative transition-all ${isNotifOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <>
                  {/* Overlay pour fermer */}
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />

                  {/* Panneau Notifications */}
                  <div className="absolute top-12 right-0 w-80 bg-white rounded-3xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <p className="font-black text-xs text-slate-800 uppercase tracking-widest">Alertes & Infos</p>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllAsRead()}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Check size={12} /> Tout lire
                        </button>
                      )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center opacity-40">
                          <Bell size={32} className="mb-2" />
                          <p className="text-xs font-bold uppercase tracking-widest italic text-center">Aucune notification</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => { if (!n.read) markAsRead(n.id); }}
                              className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-4 ${!n.read ? 'bg-blue-50/30' : ''}`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${n.type === 'low_stock' ? 'bg-orange-100 text-orange-600' :
                                  n.type === 'sale' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                {n.type === 'low_stock' ? <Package size={18} /> :
                                  n.type === 'sale' ? <ShoppingBag size={18} /> : <Bell size={18} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${!n.read ? 'text-slate-900' : 'text-slate-500'}`}>{n.title}</p>
                                <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{n.message}</p>
                                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-2">{new Date(n.created_at).toLocaleTimeString('fr-FR')}</p>
                              </div>
                              {!n.read && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 self-start"></div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-slate-100 relative group">
              <button className="flex items-center gap-2 hover:bg-slate-50 p-1 pr-2 rounded-full transition-all">
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                  <span className="font-black text-xs">{profile?.full_name?.charAt(0).toUpperCase() || <User size={16} />}</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-700 leading-none">{profile?.full_name || 'Utilisateur'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{role}</p>
                </div>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute top-12 right-0 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 hidden group-hover:block hover:block animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900">Mon Compte</p>
                </div>
                <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                  <Settings size={16} /> Profil & Sécurité
                </Link>
                <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left">
                  <LogOut size={16} /> Déconnexion
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto scroll-smooth ${isSalesPage ? 'p-0' : 'p-4 md:p-6'}`}>
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};