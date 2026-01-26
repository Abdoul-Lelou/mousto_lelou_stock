import { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { type Session, type User } from '@supabase/supabase-js';
import { type Profile, type UserRole } from '../types';

// Extended Profile for UI convenience (keeping full_name)
interface UIProfile extends Profile {
    full_name: string;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UIProfile | null;
    role: UserRole | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    role: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UIProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Initial Session Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // 2. Auth State Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, role, firstname, lastname, is_active')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile (RLS or DB):', error);
                // Profil invité par défaut pour éviter le blocage 42P17
                setProfile({ id: userId, role: 'vendeur', firstname: 'Invité', lastname: '', is_active: true, full_name: 'Utilisateur Invité' });
            } else if (data) {
                if (data.is_active === false) {
                    console.warn("Session interrompue : Compte désactivé.");
                    signOut();
                    return;
                }

                const uiProfile: UIProfile = {
                    ...data,
                    full_name: `${data.firstname || ''} ${data.lastname || ''}`.trim() || 'Utilisateur'
                };
                setProfile(uiProfile);
            }
        } catch (err) {
            console.error('Unexpected error in fetchProfile:', err);
            setProfile({ id: userId, role: 'vendeur', firstname: 'Secours', lastname: '', is_active: true, full_name: 'Mode Secours' });
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            toast.success("Déconnexion réussie");
        } catch (error: any) {
            console.error("Erreur lors de la déconnexion:", error);
            toast.error("Erreur lors de la déconnexion", { description: error.message });
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, role: profile?.role ?? null, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
