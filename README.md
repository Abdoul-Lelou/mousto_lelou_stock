# 📦 Mousto Lelou Stock

**Mousto Lelou Stock** est une application web moderne de gestion de stock, conçue pour être intuitive, rapide et visuellement agréable. Elle permet de suivre les produits, les ventes et de générer des rapports en temps réel.

![Dashboard Preview](https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2670&auto=format&fit=crop) *(Image illustrative)*

## ✨ Fonctionnalités Principales

-   **📊 Tableau de Bord Interactif** : Vue d'ensemble des KPIs (Stock total, Valeur, Alertes), graphiques de volume et notifications de stock critique.
-   **📦 Gestion d'Inventaire** : Ajout, modification et suppression de produits avec suivi des seuils d'alerte.
-   **💰 Suivi des Ventes** : Enregistrement des ventes et historique des transactions.
-   **📑 Rapports Détaillés** : Génération de rapports pour analyser les performances (export PDF supporté).
-   **🔔 Système d'Alertes** : Notifications en cas de rupture de stock ou de seuil critique atteint.

## 🛠️ Stack Technique

Ce projet utilise des technologies modernes pour assurer performance et maintenabilité :

-   **Frontend** : [React](https://react.dev/) (v19) avec [TypeScript](https://www.typescriptlang.org/)
-   **Build Tool** : [Vite](https://vitejs.dev/)
-   **Styling** : [Tailwind CSS](https://tailwindcss.com/) (v4)
-   **Base de Données** : [Supabase](https://supabase.com/)
-   **Composants & Icônes** : [Lucide React](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/) (Toasts)
-   **Visualisation** : [Recharts](https://recharts.org/)
-   **PDF** : [jsPDF](https://github.com/parallax/jsPDF)

## 🚀 Installation et Démarrage

### Prérequis

-   Node.js (v18 ou supérieur recommandé)
-   npm ou yarn

### Étapes

1.  **Cloner le dépôt**
    ```bash
    git clone https://github.com/votre-utilisateur/mousto-lelou-stock.git
    cd lelou-stock
    ```

2.  **Installer les dépendances**
    ```bash
    npm install
    ```

3.  **Configurer l'environnement**
    Créez un fichier `.env` à la racine du projet et ajoutez vos clés Supabase :
    ```env
    VITE_SUPABASE_URL=votre_url_supabase
    VITE_SUPABASE_ANON_KEY=votre_cle_publique
    ```

4.  **Lancer le serveur de développement**
    ```bash
    npm run dev
    ```
    L'application sera accessible sur `http://localhost:5173`.

## 📂 Structure du Projet

```
src/
├── api/            # Appels API (si séparés de Supabase direct)
├── assets/         # Images et fichiers statiques
├── components/     # Composants réutilisables
│   ├── layout/     # Shell, Sidebar, etc.
│   └── ...
├── hooks/          # Hooks React personnalisés
├── lib/            # Configuration des librairies (supabase.ts)
├── pages/          # Pages principales (Dashboard, Inventory, Sales, Reports)
├── types/          # Définitions TypeScript
└── utils/          # Fonctions utilitaires
```

## 📜 Scripts Disponibles

-   `npm run dev` : Lance le serveur de développement.
-   `npm run build` : Compile l'application pour la production.
-   `npm run preview` : Prévisualise la version de production localement.
-   `npm run lint` : Vérifie la qualité du code avec ESLint.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une Pull Request pour proposer des améliorations.

---

**Développé pour Mousto Lelou Stock**
