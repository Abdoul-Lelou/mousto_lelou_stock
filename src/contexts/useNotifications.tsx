import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'low_stock' | 'sale' | 'info';
    read: boolean;
    created_at: string;
}

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
                .limit(10); // Liste des 10 dernières

            if (error) throw error;
            setNotifications(data || []);

            const unread = data?.filter(n => !n.read).length || 0;
            setUnreadCount(unread);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();

        // Abonnement Temps Réel
        if (!user) return;
        const subscription = supabase
            .channel('notifications_changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user, fetchNotifications]);

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
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
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);

            if (error) throw error;
            fetchNotifications();
            toast.success("Toutes les notifications marquées comme lues");
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const createNotification = async (targetUserId: string, title: string, message: string, type: 'low_stock' | 'sale' | 'info') => {
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

    const notifyAdmins = async (title: string, message: string, type: 'low_stock' | 'sale' | 'info') => {
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
        refresh: fetchNotifications
    };
};
