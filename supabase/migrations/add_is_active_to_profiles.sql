-- Migration: Ajout de la colonne is_active à la table profiles
-- Description: Permet d'activer/désactiver les utilisateurs
-- Date: 2026-01-25

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Commentaire pour documentation
COMMENT ON COLUMN profiles.is_active IS 'Indique si le compte utilisateur est actif et autorisé à se connecter';
