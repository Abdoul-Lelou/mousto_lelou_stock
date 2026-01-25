-- Migration: Ajout de la colonne created_by pour l'imputabilité
-- Description: Ajoute une référence à l'utilisateur qui a créé chaque mouvement de stock
-- Date: 2026-01-25

-- Ajout de la colonne created_by
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Ajout d'un index pour améliorer les performances des requêtes filtrées par utilisateur
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by 
ON stock_movements(created_by);

-- Commentaire pour documentation
COMMENT ON COLUMN stock_movements.created_by IS 'ID de l''utilisateur qui a créé ce mouvement de stock (imputabilité)';
