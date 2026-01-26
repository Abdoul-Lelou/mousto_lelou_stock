import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
}

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }: ModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className={`bg-white rounded-[2.5rem] w-full ${maxWidth} shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 origin-center flex flex-col max-h-[90vh]`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                    <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-200 rounded-full hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto scrollbar-hide flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
};
