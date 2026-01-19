// Définition des rôles utilisateurs
export type UserRole = 'admin' | 'vendeur';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
}

// Définition d'un produit (Carreaux, Sanitaires, etc.)
export interface Product {
  id: string;
  name: string;
  category_id: string;
  quantity: number;
  min_threshold: number; // Le seuil pour l'alerte rupture
  unit_price: number;
  sku?: string;
  image_url?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
}

// Mouvement de stock (Entrée / Sortie)
export interface StockMovement {
  id: string;
  product_id: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  created_at: string;
}