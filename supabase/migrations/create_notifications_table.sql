-- Migration: Création de la table notifications
-- Description: Table pour stocker les alertes de stock et notifications de ventes
-- Date: 2026-01-25

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'low_stock', 'sale', 'info'
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres notifications
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- Les utilisateurs peuvent marquer leurs propres notifications comme lues
CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Autoriser le système (ou fonctions Edge) à insérer des notifications
CREATE POLICY "Enable insert for all users" 
ON notifications FOR INSERT 
WITH CHECK (true);

-- Commentaire pour documentation
COMMENT ON TABLE notifications IS 'Table stockant les alertes et notifications interactives pour les utilisateurs';
