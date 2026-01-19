import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Bell, User, Menu, X } from 'lucide-react';

export const Shell = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isSalesPage = window.location.pathname === '/sales';

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
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-slate-100">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                <User size={16} />
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