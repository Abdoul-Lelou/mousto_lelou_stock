# 🛠️ MOUSTO_LELOU - ERP de Gestion de Quincaillerie

Solution Full-Stack sécurisée (React/Supabase) pour le suivi de stock et l'analyse décisionnelle.

## 🚀 Points Forts
-   **Gestion CRUD complète** : Administration totale des utilisateurs (Activer/Désactiver/Supprimer).
-   **Synthèse Analytique** : Calculateur de flux entrées/sorties par produit intégré (Module BI).
-   **Sécurité RLS Avancée** : Protection rigoureuse via des fonctions `Security Definer` pour éviter les récursions SQL (Fix 42P17).
-   **Real-time UX** : Notifications sonores et visuelles synchronisées pour une réactivité maximale.

## 🛠️ Stack Technologie
-   **Frontend** : React 18, Tailwind CSS, Framer Motion.
-   **Backend** : Supabase (Auth, DB Realtime, Edge Functions).
-   **Reporting** : Recharts & jsPDF.

## 🛡️ Audit & Traçabilité (Compliance)
-   **Système d'Audit Complet** : Chaque action sensible (suppression de compte, modification manuelle de stock, réapprovisionnement) est consignée dans un journal d'activité inaltérable.
-   **Intégrité Comptable** : Les produits ne sont jamais supprimés physiquement. L'archivage logique (`is_archived`) garantit que l'historique des ventes et les statistiques restent cohérents au fil des années.
-   **Transparence Admin** : Un tableau de bord dédié permet aux administrateurs de filtrer et d'analyser les événements système par date et par type d'action.

## 🖼️ Excellence UI/UX
-   **Mode Sombre Natif** : Interface adaptative avec mémorisation des préférences utilisateur.
-   **Empty States Professionnels** : Guidage de l'utilisateur via des composants dédiés lorsque les données sont absentes.
-   **Design Réactif** : Sidebar rétractable et interfaces optimisées pour l'usage mobile en magasin (tablettes et smartphones).
