import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

export const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmer",
    cancelText = "Annuler",
    isDanger = true
}: ConfirmationModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden scale-in-center border border-slate-200 dark:border-slate-700">
                <div className={`px-8 py-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center ${isDanger ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-slate-50/50 dark:bg-slate-800/50'}`}>
                    <div className="flex items-center gap-3">
                        {isDanger && <AlertTriangle className="text-red-500" size={20} />}
                        <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 uppercase tracking-tight">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-8">
                    <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-6 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all uppercase text-[10px] tracking-widest"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 py-3 px-6 text-white rounded-xl font-black shadow-lg transition-all uppercase text-[10px] tracking-widest active:scale-95 ${isDanger
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
