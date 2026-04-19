# Essence - Application de Cartographie des Prix Carburants

Application Next.js pour visualiser les prix des carburants en Mauritanie (démonstration).

## ⚠️ Avertissement Important - Données de Démonstration

**Ce projet contient des données de DÉMONSTRATION uniquement.**

Les prix et coordonnées des stations présentés dans ce projet sont **fictifs** et à but de démonstration technique uniquement. Ils sont dérivés du dataset français des prix des carburants (data.gouv.fr) et transformés pour créer un jeu de données de test pour la Mauritanie.

**NE PAS utiliser ces données comme référence de prix réels en Mauritanie.**

Source du dataset original : https://www.data.gouv.fr/datasets/prix-des-carburants-en-france-flux-instantane-v2-amelioree

## Stack Technique

- **Framework** : Next.js 16 (App Router)
- **Langage** : TypeScript
- **Base de données** : Neon PostgreSQL (serverless)
- **ORM** : Prisma
- **Style** : Tailwind CSS 4
- **Composants** : shadcn/ui, Radix UI

## Prérequis

- Node.js 18+
- npm ou pnpm
- Une base de données Neon PostgreSQL

## Installation

### 1. Cloner et installer les dépendances

```bash
npm install
```

### 2. Configuration environnement

Copier le fichier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Éditer `.env` avec votre DATABASE_URL Neon :

```env
DATABASE_URL="postgresql://neondb_owner:npg_AJjt31oOSQLk@ep-lucky-darkness-amuwltdk-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

**⚠️ IMPORTANT** : Le fichier `.env` ne doit JAMAIS être commité. Il est déjà dans `.gitignore`.

### 3. Initialiser Prisma

Générer le client Prisma :

```bash
npx prisma generate
```

Créer et appliquer les migrations :

```bash
npx prisma migrate dev --name init
```

Alternative (pour le développement rapide sans migrations) :

```bash
npx prisma db push
```

### 4. Vérifier la base de données

Ouvrir Prisma Studio pour inspecter la base :

```bash
npx prisma studio
```

## Import des Données CSV

### Option 1 : Utiliser les données de démo fournies

Un fichier CSV de démonstration est déjà disponible : `data/mauritania-fuel-demo.csv`

Pour l'importer dans la base :

```bash
npm run import:csv
```

### Option 2 : Transformer un fichier CSV français

Si vous avez le fichier CSV français original des prix carburants :

```bash
# Télécharger d'abord le fichier depuis data.gouv.fr
# Puis le transformer :
npm run transform:csv -- ./chemin/vers/prix-des-carburants-en-france-flux-instantane-v2.csv
```

Le fichier transformé sera généré dans `data/mauritania-fuel-demo.csv`.

Puis l'importer :

```bash
npm run import:csv
```

### Option 3 : Générer des données synthétiques

Si aucun fichier source n'est trouvé, le script de transformation génère automatiquement des données de démonstration synthétiques :

```bash
npm run transform:csv
```

## Démarrage de l'Application

```bash
npm run dev
```

L'application sera accessible sur http://localhost:3000

## Scripts Disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Démarrer le serveur de développement |
| `npm run build` | Builder pour production |
| `npm run db:generate` | Générer le client Prisma |
| `npm run db:migrate` | Créer et appliquer une migration |
| `npm run db:studio` | Ouvrir Prisma Studio |
| `npm run db:push` | Synchroniser le schéma (dev uniquement) |
| `npm run transform:csv` | Transformer CSV France → Mauritanie |
| `npm run import:csv` | Importer CSV dans Neon via Prisma |

## Schéma de Base de Données

### Tables Principales

- **stations** : Stations-service avec coordonnées GPS
- **fuel_types** : Types de carburants (GAZOLE, SP95, SP98, etc.)
- **current_prices** : Prix actuels par station et type de carburant
- **price_history** : Historique des changements de prix
- **import_runs** : Suivi des imports CSV

### Relations

- Une station a plusieurs prix (current_prices)
- Un type de carburant a plusieurs prix
- Les prix historiques enregistrent chaque changement

## Architecture

```
├── app/                    # Routes Next.js App Router
│   ├── api/               # API routes
│   ├── map/               # Page carte
│   ├── station/[id]/      # Page détail station
│   └── import/             # Page import CSV
├── components/            # Composants React
│   ├── ui/                # Composants shadcn/ui
│   ├── fuel-map.tsx       # Carte des stations
│   ├── station-card.tsx   # Carte station
│   └── search-filters.tsx # Filtres de recherche
├── data/                  # Fichiers CSV
├── lib/                   # Bibliothèques
│   ├── prisma.ts          # Client Prisma
│   └── types.ts           # Types TypeScript
├── prisma/
│   └── schema.prisma      # Schéma Prisma
├── scripts/               # Scripts utilitaires
│   ├── transform-france-csv-to-mauritania.ts
│   └── import-fuel-csv-prisma.ts
└── public/                # Assets statiques
```

## Fonctionnalités d'Import CSV

Le script d'import (`scripts/import-fuel-csv-prisma.ts`) fournit :

- **Idempotence** : Les stations sont créées ou mises à jour selon externalId + countryCode
- **Historique des prix** : Chaque changement de prix est enregistré dans price_history
- **Tracking des imports** : Un ImportRun est créé pour chaque exécution avec statistiques
- **Gestion d'erreurs** : Les lignes invalides sont ignorées avec rapport d'erreurs
- **Résumé final** : Nombre de stations/prix créés/mis à jour

## Notes de Développement

### Connexion Neon

L'application utilise une connexion directe à Neon PostgreSQL via Prisma. Pour les environnements serverless (Vercel), Neon recommande l'utilisation de la chaîne de connexion pooled (`-pooler` dans l'URL).

### Gestion des types carburants

Les types de carburants sont automatiquement initialisés lors du premier import :
- GAZOLE (Gasoil/Diesel)
- SP95 (Super Sans Plomb 95)
- SP98 (Super Sans Plomb 98)
- E10 (SP95-E10)
- E85 (Bioéthanol E85)
- GPLC (Gaz de Pétrole Liquéfié)

### Currency

La devise par défaut est le **MRU** (Ouguiya mauritanien) pour toutes les données de démonstration.

## Contribution

Ce projet est un MVP de démonstration. Les contributions doivent rester dans ce périmètre :
- Pas d'authentification requise
- Pas de Docker
- Pas de système de contribution utilisateur
- Simple et focalisé sur la cartographie des prix

## Licence

Projet de démonstration - Les données sont fictives et ne doivent pas être utilisées comme référence commerciale.
