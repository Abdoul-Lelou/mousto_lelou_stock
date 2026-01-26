import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'low_stock' | 'sale' | 'info' | 'warning';
    is_read: boolean;
    created_at: string;
}

// Singleton pour l'AudioContext afin de débloquer le son au premier clic
let audioContext: AudioContext | null = null;
const unlockAudio = () => {
    if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
};
window.addEventListener('click', unlockAudio);
window.addEventListener('touchstart', unlockAudio);

export const useNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setNotifications(data || []);

            const unread = data?.filter(n => !n.is_read).length || 0;
            setUnreadCount(unread);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const playNotificationSound = useCallback(() => {
        if (!audioContext || audioContext.state !== 'running') return;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start();
        osc.stop(audioContext.currentTime + 0.3);
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchNotifications();

        const notifSub = supabase
            .channel('notifications_changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, () => {
                playNotificationSound();
                fetchNotifications();
            })
            .subscribe();

        const salesSub = supabase
            .channel('sales_realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'sales'
            }, (payload: any) => {
                if (payload.new.seller_id !== user.id) {
                    toast.info(`Nouvelle vente : ${payload.new.total_price.toLocaleString()} FG`);
                    playNotificationSound();
                    fetchNotifications();
                }
            })
            .subscribe();

        const stockSub = supabase
            .channel('stock_alerts')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'products'
            }, (payload: any) => {
                if (payload.new.quantity <= payload.new.min_threshold && payload.old.quantity > payload.old.min_threshold) {
                    toast.warning(`Alerte Stock : ${payload.new.name} est critique !`);
                    playNotificationSound();
                    fetchNotifications();
                }
            })
            .subscribe();

        return () => {
            notifSub.unsubscribe();
            salesSub.unsubscribe();
            stockSub.unsubscribe();
        };
    }, [user, fetchNotifications, playNotificationSound]);

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;
            fetchNotifications();
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (error) throw error;
            fetchNotifications();
            toast.success("Toutes les notifications marquées comme lues");
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const createNotification = async (targetUserId: string, title: string, message: string, type: 'low_stock' | 'sale' | 'info' | 'warning') => {
        try {
            const { error } = await supabase
                .from('notifications')
                .insert([{
                    user_id: targetUserId,
                    title,
                    message,
                    type
                }]);

            if (error) throw error;
        } catch (err) {
            console.error('Error creating notification:', err);
        }
    };

    const notifyAdmins = async (title: string, message: string, type: 'low_stock' | 'sale' | 'info' | 'warning') => {
        try {
            const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
            if (!admins) return;

            const notificationsToInsert = admins.map(admin => ({
                user_id: admin.id,
                title,
                message,
                type
            }));

            const { error } = await supabase.from('notifications').insert(notificationsToInsert);
            if (error) throw error;
        } catch (err) {
            console.error('Error notifying admins:', err);
        }
    };

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        createNotification,
        notifyAdmins,
        refresh: fetchNotifications,
        playNotificationSound
    };
};
