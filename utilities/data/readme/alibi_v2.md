# Alibi - Developer Documentation

Alibi is an interactive kitchen inventory and cost management product built within the Nexus suite.

## Architecture & Tech Stack
- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (`app.js` is the core application logic).
- **Styling**: Utilizes shared Nexus design tokens (`tokens.css`, `tile-polish.css`, `ui-physics.css`).
- **Offline-First**: Operates heavily on local storage to ensure rapid, offline-capable kitchen usage where Wi-Fi might be spotty.
- **PWA Ready**: Includes a `manifest.webmanifest`, service worker capabilities, and iOS touch icons for home-screen installation.

## Core Modules
- **State Management**: Centralized store in `app.js` managing months, invoices, inventory counts, and recipes.
- **Analytics Engine**: Calculates COGS%, net sales, and targets in real-time on the client side.
- **Import/Export**: JSON-based backup system to serialize and deserialize the entire application state.

## Routing
- Single Page Application (SPA) architecture. Uses data attributes (`data-goto-tab`) and DOM manipulation to switch panels (`#panel-dashboard`, etc.) without page reloads.

## DB Integration
- Purely local-first (Local Storage / IndexedDB). The `runtime-guard.js` script handles environment checks.
