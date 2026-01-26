import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
}

export const EmptyState = ({ icon: Icon, title, description }: EmptyStateProps) => {
    return (
        <div className="py-20 flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <Icon size={40} className="text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">{title}</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-[250px] leading-relaxed">
                {description}
            </p>
        </div>
    );
};
