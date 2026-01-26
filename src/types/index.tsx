// Définition des rôles utilisateurs
export type UserRole = 'admin' | 'vendeur';

export interface Profile {
  id: string;
  role: UserRole;
  firstname: string;
  lastname: string;
  is_active: boolean;
}

// Product Definition
export interface Product {
  id: string;
  name: string;
  category_id?: string;
  quantity: number;
  min_threshold: number;
  unit_price: number;
  sku?: string;
  image_url?: string;
  is_archived: boolean;
  created_at: string;
}

// Sale Definition
export interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  total_price: number;
  seller_name: string;
  created_by: string;
  created_at: string;
  products?: Partial<Product>;
}

// Category Definition
export interface Category {
  id: string;
  name: string;
}

// Stock Movement Definition
export interface StockMovement {
  id: string;
  product_id: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  created_by: string;
  created_at: string;
  products?: Partial<Product>;
}