# Contribuer à Skill Arena

Skill Arena est le **hub de mini-jeux** de l'écosystème Sterenna Studio, accessible
sur `nitro.sterenna.fr/arena/`. C'est une app **Next.js** (App Router, export statique).

---

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000/arena
```

> Le `basePath` est `/arena` — pense à inclure ce préfixe quand tu testes une URL.

Aucun secret requis pour développer. Pour tester l'auth/scores Supabase en local,
crée un `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

(La clé **anon** est publique par design — jamais de clé service_role côté client.)

---

## Structure

```
src/
  app/
    page.tsx              # accueil — grille des jeux
    games/<slug>/page.tsx # un mini-jeu solo par dossier
    room/                 # multijoueur (Supabase Realtime)
  components/
    games/                # composants de jeux (solo & multi)
    room/                 # lobby, countdown, résultats
  hooks/useRoom.ts        # logique Realtime (presence + broadcast)
  lib/games.ts            # catalogue des jeux (source de vérité)
```

### Ajouter un mini-jeu solo

1. Crée `src/app/games/<slug>/page.tsx` (composant `'use client'`).
2. Ajoute une entrée dans `src/lib/games.ts` (`GAMES`).
3. Le jeu apparaît automatiquement sur la home.

### Ajouter un jeu multijoueur

1. Crée le composant dans `src/components/games/mp/`.
2. Enregistre-le dans `GAME_COMPONENTS` (`src/app/room/page.tsx`).
3. Ajoute-le à la liste `MP_GAMES`.

### Lier un jeu externe (statique de l'écosystème)

Ajoute une entrée avec `external: '/mon-jeu/'` dans `GAMES` — rendu en `<a>` pour
bypasser le `basePath`.

---

## Avant d'ouvrir une PR

```bash
npm run build      # doit passer (type-check + export statique)
```

Branche depuis `main`/`master`, commits préfixés (`feat:`, `fix:`, `chore:`…),
PR + review avant merge. Voir le
[CONTRIBUTING global](https://github.com/sterenna-studio/gwen-ha-star-static/blob/main/CONTRIBUTING.md).
