# BZH Bourse — Prototype V0 + SQL DDL

## Lancer le prototype local (client-only)
1. `cd /mnt/data/bzh_bourse_mockup`
2. (Option A) Serveur Python simple : `python -m http.server 8000 -d static`
   - Ouvre http://localhost:8000/
3. (Option B) Flask (fichier `app.py`) : `pip install flask && python app.py`
   - Ouvre http://localhost:8000/

- **Ticks**: toutes 30s (simulation locale), bouton *Pause marché*, recherche, sélection d’un titre.
- **Admin mock**: coche *Mode admin* → déclencheur d’événements visuels (pas de persistance).

## SQL (Supabase/Postgres)
Les fichiers se trouvent dans `sql/` :
- `schema.sql` : tables marché, historiques, ordres/trades, portefeuilles, ledger d’or, snapshots.
- `rls_and_rpc.sql` : RLS de base + RPC `rpc_award_gold` et `rpc_place_order` (squelettes).

**Important** : la fonction `rpc_award_gold` présume une table `players(id uuid primary key, gold int)`.
Adapte le nom de schéma/noms de colonnes si besoin.

## Étapes suivantes
- Edge Function `market-tick` (cron 30s) pour alimenter `prices_ticks`.
- Dashboard read-only branché Supabase Realtime.
- Flux d’ordres (front) appelant `rpc_place_order` (idempotence via `ref`).

— Généré le 2025-11-12T07:39:21
