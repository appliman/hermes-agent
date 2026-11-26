# Bots & Sessions Explorer (`bot-sessions-explorer`)

Plugin Desktop pour **Hermes v0.23.2+** offrant une interface en deux colonnes pour explorer tous les bots (locaux et sur gateways distantes) ainsi que leurs sessions.

## Fonctionnalités

- **Colonne gauche — Bots disponibles** :
  - Regroupement par machine / gateway (`ConnectionGlyph`)
  - Avatar (`Blobatar` ou image du profil), titre, nom de profil, description / dernier message
  - État détaillé : `Connecté`, `Actif`, `Bot arrêté`, `Profil indisponible`, `Gateway inaccessible`, `Erreur d'autorisation`, `Connexion Desktop interrompue`
  - Recherche en direct, sélection persistée (`ctx.storage`), double-clic pour ouvrir le Bot Chat, menu contextuel
  - Colonne redimensionnable (largeur persistée)
- **Colonne droite — Sessions du bot sélectionné** :
  - Récupération via `host.listPersistedSessions(...)` avec fallback `session.list` et `session.active_list`
  - Inclusion du `Bot Chat` canonique (`bot_chat`) et de la session récente
  - Badges de type : `Bot Chat`, `Standard`, `Cron`, `Groupe`, `Délégué`, `Subagent`
  - Tri par activité récente, recherche et filtres par type
  - Ouverture directe dans Hermes au clic (`host.openSession`), menu contextuel (ouvrir, copier l'ID, afficher les détails)
- **Temps réel & résilience** :
  - Écoute des événements Hermes (`ctx.onEvent('*')`) avec invalidation ciblée + polling de secours (12 s)
  - Compatible thème clair / sombre via les variables CSS Hermes (`--ui-*`)

## Installation locale

Le plugin est installé dans :

```text
$HERMES_HOME/desktop-plugins/bot-sessions-explorer/plugin.js
```

Dans Hermes Desktop, rechargez les plugins via la palette de commandes :

```text
⌘K (ou Ctrl+K) → Reload desktop plugins
```

Puis ouvrez **Bots & Sessions** depuis la barre latérale gauche, la barre d'état (`Bots`) ou `Ctrl+K → Ouvrir Bots & Sessions`.

## Distribution (paquet Hermes)

Le paquet complet se trouve dans `plugins/bot-sessions-explorer/` :

```text
plugins/bot-sessions-explorer/
├── plugin.yaml
├── README.md
└── desktop/
    └── plugin.js
```
