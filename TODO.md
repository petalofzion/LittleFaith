# LittleFaith – Phase-0 TODO 🍇✨

_Desktop-first, Rust-powered, React-cute (Tailwind + DaisyUI)._

## Status

- **Focus**: get a working dev loop (frontend scaffold + core skeleton).
- **Next milestone**: app shell renders with mock data in desktop + web.
- **Blocked**: none.

## Legend

- `[P0]` must-do to start coding
- `[P1]` important for near-term progress
- `[P2]` nice-to-have

## Decisions (keep current)

- **UI stack**: React + Vite + Tailwind + DaisyUI
- **Desktop**: Tauri 2
- **JS tooling**: Bun
- **Core**: Rust crate compiled to native + WASM

## Now (Setup + Scaffolding)

- [x] [P0] ✅ Get everything set up to start coding
  - [x] Install toolchains via `./setup.sh` (Rust, Bun, Tauri CLI).
  - [x] Align JS tooling on Bun (CI, Justfile, docs, scripts).
  - [x] Add minimal frontend scaffold (Vite + React + Tailwind) for immediate iteration.
  - [x] Add basic app shell (header + pane layout) to validate UI direction.
- [x] [P0] Scaffold Tauri + React app (`bunx create-tauri-app`).
- [x] [P0] Build split-pane skeleton: Sidebar ▸ BiblePane ▸ CommentaryPane.
- [x] [P1] Install Tailwind + DaisyUI presets; add light/dark toggle.
- [x] [P1] Phase 1 UX shell: Quick Setup flow + nav + Home modules.
- [x] [P1] Phase 1 reader: typography controls, highlights, notes scaffolding.
- [x] [P1] Settings shell: Appearance, Reading, Data location.
- [x] [P1] Wire “Go To Verse” (`⌘/Ctrl + L`) → Rust `invoke("lookup")`.
- [x] [P1] Wire Read + Search views to Rust core via Tauri commands.

## Next (Core + Data)

- [x] [P0] Design initial SQLite schema (`verses`, `fts_verses`).
- [x] [P1] Add metadata table for modules and versification.
- [x] [P1] Create OSIS → SQLite compiler CLI (`lf-compile`) with progress bar.
- [x] [P1] Implement SQLite FTS5 search wrapper (basic).
- [x] [P1] Add simple boolean query parser.
- [x] [P1] Unit tests: lookup accuracy, search hits.
- [x] [P2] DB size sanity check (sample fixture < 1 MB).
- [x] [P2] DB size sanity check (< 10 MB for DR Bible, drc.db ~9 MB).
- [x] [P2] Handle OSISID ranges and multi-ID verses.
- [x] [P2] Emit minimal module manifest alongside compiled DB.
- [x] [P2] Add search ranking or snippet generation for results.
- [x] [P2] Script to download public-domain Bibles (Douay-Rheims, Vulgate) + hash check.
- [x] [P2] Batch-compile into `.bbmod` bundles; commit small sample under `/fixtures`.
- [x] [P2] Draft `manifest.toml` spec (canon, language, licence, versification).

## Later (UX + Platform)

- [ ] [P1] Integrate React Query for verse-fetch cache.
- [ ] [P1] Create Zustand store (`useLayoutStore`) for pane positions, theme, sidebar.
- [ ] [P2] Implement DaisyUI tooltip for verse hover preview.
- [ ] [P2] Draft figma / wireframe: 3-pane study workspace + focus reading mode.
- [ ] [P2] Decide default font stack (Noto-Serif + Noto-Sans for multilingual).
- [ ] [P2] Plan i18n pipeline (`react-i18next`, JSON locale files).

## DevOps + Automation

- [ ] [P1] GitHub Actions matrix build (Win / macOS / Linux) + notarize macOS.
- [ ] [P2] Draft `tauri.conf.json` for auto-update channel “alpha”.
- [ ] [P2] Nightly workflow: compile latest modules, run DB migrations, publish artifacts.
- [ ] [P2] Proof-of-concept Dropbox sync task (Rust crate + OAuth).
- [ ] [P2] Encrypt vault sync with AEAD (e.g., XChaCha20-Poly1305) before upload.

## Docs + Community

- [x] 📚 `docs/ARCHITECTURE.md` (high-level diagram).
- [x] [P1] Write “Setting up dev env” guide (Rust toolchain + Bun steps).
- [x] ~~Add `CODE_OF_CONDUCT.md` + `CONTRIBUTING.md`.~~
- [x] Add `CODE_OF_CONDUCT.md` + `CONTRIBUTING.md`.
- [ ] [P2] Open GitHub Discussions – seed “Module wishes” & “Design ideas” threads.

## Meta / House-keeping

- [x] 💖 Add `LICENSE` (MIT) at repo root.
- [x] 🏷️ ~~Configure Cargo workspaces + JS workspace (`/core`, `/frontend`).~~
- [x] 🏷️ Configure Cargo workspace (`/core`) and frontend package (`/frontend`).
- [ ] 🤖 Prettier + ESLint + Rustfmt + Clippy CI gates.
- [x] 📌 ~~Pin Node and Rust toolchains for reproducible builds.~~
- [x] 📌 Pin Rust toolchain for reproducible builds.
- [x] 🐚 Add ShellCheck for `setup.sh`.
- [ ] 🔖 Define semantic versioning & branch naming (e.g. `main`, `feat/*`).
- [ ] 🧪 Set up Vitest (+ jsdom) for unit / component tests.
- [ ] 🔍 (Optional) Configure Jest + React-Testing-Library for UI snapshot / smoke tests.
- [x] 📱 Confirm cross-platform path: Tauri + React for desktop/web, Capacitor later for mobile.

## Icebox / Later

- [ ] 🗺️ Map viewer plugin (Leaflet + BiblePlaces KML).
- [ ] 🐑 Liturgy of the Hours feed importer.
- [ ] 📲 Web-WASM edition POC (wasm-pack + React/Vite static export).
