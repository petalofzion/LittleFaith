# Architecture

## Goals

- Cross-platform delivery: desktop app and website from the same UI codebase.
- Fast iteration with modern UI while keeping a small runtime footprint.
- Shared core logic in Rust for consistent features across platforms.

## High-Level Components

1. **Core engine (Rust)**
   - `littlefaith-core` owns Bible data access, search, and study features.
   - Compiles to native for desktop and to WASM for the web.
2. **UI (Web stack)**
   - React + Vite + Tailwind + DaisyUI for rapid iteration.
   - Runs in Tauri for desktop and as a PWA on the web.
3. **App container**
   - Desktop: Tauri wraps the UI and exposes Rust commands via `invoke`.
   - Web: Vite PWA bundles the same UI and uses WASM bindings.

## Data Flow

- UI requests data or actions via a platform adapter.
- Desktop adapter uses Tauri `invoke` to call Rust.
- Web adapter uses WASM bindings to the same Rust APIs.

## Storage Layout

- `Modules/`: read-only SQLite bundles of Bible modules.
- `UserVault.db`: notes, highlights, and study artifacts (encrypted).
- `Cache/`: search indexes and derived assets.

## Build and Tooling

- Rust: Cargo workspace with `core` crate as the shared engine.
- UI: Bun for installs and scripts.
- Desktop builds via Tauri; web builds via Vite (PWA target).

## Future Targets

- Mobile: wrap the same UI with Capacitor after desktop/web are stable.
- Feature expansion: concordance, cross-links, Strong's, and scholar-grade tools.
