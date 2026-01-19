import React from 'react';
import { Sidebar } from './Sidebar';
import { Bell, User, Menu } from 'lucide-react';

export const Shell = ({ children }: { children: React.ReactNode }) => {
  // Optionnel: Détecter la page actuelle pour un comportement spécifique
  const isSalesPage = window.location.pathname === '/sales';

  return (
    <div className="flex h-screen bg-[#F1F5F9] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar - Largeur fixe 256px (w-64) */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 border-r border-slate-200 bg-slate-900 z-20 shadow-xl">
        <Sidebar />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Header - S'étire sur 100% de l'espace restant */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
          
          <div className="flex items-center gap-4 flex-1">
            {/* Bouton Menu Mobile (visible uniquement sur petit écran) */}
            <button className="lg:hidden p-2 text-slate-600">
                <Menu size={20} />
            </button>

            <div className="relative w-full max-w-md hidden md:block">
                <h4 className="text-sm font-bold text-slate-800">MOUSTO_LELOU</h4>
                {/* <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /> */}
                {/* <input 
                type="text" 
                placeholder="Recherche rapide..." 
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-2 pl-10 pr-4 text-sm transition-all outline-none"
                /> */}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-50 hover:text-blue-600 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-none">Abdourahmane</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Admin</p>
              </div>
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                <User size={16} />
              </div>
            </div>
          </div>
        </header>

        {/* Zone de contenu - SANS max-width pour coller aux bords */}
        <main className={`flex-1 overflow-y-auto scroll-smooth ${isSalesPage ? 'p-0' : 'p-4 md:p-6'}`}>
            <div className="w-full h-full"> 
                {children}
            </div>
        </main>
      </div>
    </div>
  );
};