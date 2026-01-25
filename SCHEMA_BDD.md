    # Schéma de Base de Données - Mousto Lelou Stock

    Basé sur les définitions TypeScript du projet (`src/types/index.tsx`), voici la structure de la base de données Supabase.

    ## 📊 Diagramme Relationnel (ERD)

    ```mermaid
    erDiagram
        PROFILES {
            uuid id PK
            string role "admin | vendeur"
            string full_name
        }

        CATEGORIES {
            uuid id PK
            string name
        }

        PRODUCTS {
            uuid id PK
            string name
            uuid category_id FK
            int quantity
            int min_threshold
            float unit_price
            string sku
            string image_url
            timestamp created_at
        }

        STOCK_MOVEMENTS {
            uuid id PK
            uuid product_id FK
            string type "in | out"
            int quantity
            string reason
            timestamp created_at
        }

        PRODUCTS }|--|| CATEGORIES : "appartient à"
        STOCK_MOVEMENTS }|--|| PRODUCTS : "concerne"
    ```

    ## 📝 Détails des Tables

    ### 1. `profiles`
    Stocke les informations supplémentaires des utilisateurs (liée à la table `auth.users` de Supabase).

    | Colonne | Type | Description |
    | :--- | :--- | :--- |
    | `id` | UUID | Clé primaire (correspond à `auth.users.id`) |
    | `role` | Text | Rôle de l'utilisateur (`admin` ou `vendeur`) |
    | `full_name` | Text | Nom complet de l'utilisateur |

    ### 2. `products`
    Table centrale contenant l'inventaire.

    | Colonne | Type | Description |
    | :--- | :--- | :--- |
    | `id` | UUID | Identifiant unique du produit |
    | `name` | Text | Nom du produit |
    | `category_id` | UUID | Référence vers la table `categories` |
    | `quantity` | Integer | Stock actuel |
    | `min_threshold` | Integer | Seuil d'alerte pour stock critique |
    | `unit_price` | Numeric | Prix unitaire (FG) |
    | `sku` | Text | Code de référence unique (optionnel) |
    | `image_url` | Text | Lien vers l'image du produit (optionnel) |
    | `created_at` | Timestamp | Date de création |

    ### 3. `categories`
    Catégories de produits (ex: Carreaux, Sanitaires).

    | Colonne | Type | Description |
    | :--- | :--- | :--- |
    | `id` | UUID | Identifiant unique |
    | `name` | Text | Nom de la catégorie |

    ### 4. `stock_movements`
    Historique des entrées et sorties de stock.

    | Colonne | Type | Description |
    | :--- | :--- | :--- |
    | `id` | UUID | Identifiant du mouvement |
    | `product_id` | UUID | Produit concerné |
    | `type` | Text | Type de mouvement (`in` pour entrée, `out` pour sortie) |
    | `quantity` | Integer | Quantité déplacée |
    | `reason` | Text | Motif (ex: "Vente", "Réapprovisionnement", "Perte") |
    | `created_at` | Timestamp | Date du mouvement |
