# Manuel de Migration & Secours Supabase

Ce guide explique comment restaurer ou migrer l'infrastructure de la base de données vers un nouveau projet Supabase.

## 📋 Pré-requis

1.  Un compte [Supabase](https://supabase.com/).
2.  Un nouveau projet créé sur le tableau de bord Supabase.

## 🚀 Étapes de Restauration

### 1. Initialisation du Schéma
Le fichier `supabase/master_db_setup.sql` contient l'intégralité de la logique métier (Tables, Fonctions, RLS).

1.  Ouvrez votre projet dans le tableau de bord Supabase.
2.  Allez dans l'onglet **SQL Editor**.
3.  Créez une nouvelle requête nommée "Initial Setup".
4.  Copiez et collez l'intégralité du contenu de `supabase/master_db_setup.sql`.
5.  Cliquez sur **Run**.

### 2. Configuration Authentification
Le script crée une table `public.profiles` qui est liée à la table interne `auth.users`. Pour que les inscriptions fonctionnent :

1.  Allez dans **Authentication** > **Providers**.
2.  Désactivez "Confirm Email" si vous souhaitez tester rapidement (sinon configurez le SMTP).
3.  Ajoutez un utilisateur manuellement ou via l'application pour tester le déclenchement de la création du profil.

### 3. Connexion au Frontend
Mettez à jour vos variables d'environnement dans le fichier `.env` de votre application React avec la nouvelle URL et la clé anonyme fournies par votre nouveau projet Supabase (**Project Settings** > **API**).

```env
VITE_SUPABASE_URL=VOTRE_NOUVELLE_URL
VITE_SUPABASE_ANON_KEY=VOTRE_NOUVELLE_CLE_ANON
```

## 🛡️ Note sur la Sécurité
Toutes les politiques RLS (Row Level Security) sont incluses dans le script maître. Elles garantissent que :
- Seuls les administrateurs peuvent modifier le catalogue.
- Les vendeurs ne voient que les informations autorisées.
- L'audit trail est protégé contre les modifications manuelles.
