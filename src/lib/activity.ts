import { supabase } from './supabase';

export const logActivity = async (action: string, details: any = {}) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        await supabase.from('activity_logs').insert([{
            user_id: session.user.id,
            action,
            details,
            timestamp: new Date().toISOString()
        }]);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};
