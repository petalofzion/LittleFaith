# LittleFaith – Phase-0 TODO 🍇✨

_Desktop-first, Rust-powered, React-cute (Tailwind + shadcn/ui)._

## 0️⃣ Meta / House-keeping

- [x] 💖 Add `LICENSE` (MIT) at repo root.
- [x] 🏷️ Configure **Cargo workspaces** + **pnpm** monorepo (`/core`, `/frontend`).
- [x] 🤖 Prettier + ESLint + Rustfmt + Clippy CI gates.
- [ ] 🔖 Define semantic versioning & branch naming (e.g. `main`, `feat/*`).
- [ ] 🧪 Set up **Vitest** (+ jsdom) for unit / component tests.
- [ ] 🔍 (Optional) Configure **Jest + React-Testing-Library** for UI snapshot / smoke tests.

## 1️⃣ Core Engine (`littlefaith-core`)

- [x] 🚧 Scaffold crate, expose `BibleDb::lookup(book, chap, verse)`.
- [ ] 📦 Create **OSIS → SQLite compiler CLI** (`lf-compile`) with progress bar.
- [ ] 🗃️ Design initial SQLite schema (`verses`, `metadata`, `fts_verses`).
- [ ] 🔍 Implement **SQLite FTS5** search wrapper + simple boolean query parser.
- [ ] 🧪 Unit tests: lookup accuracy, search hits, DB size sanity (< 10 MB for DR Bible).

## 2️⃣ Data & Modules

- [ ] 📥 Script to download public-domain Bibles (Douay-Rheims, Vulgate) + hash check.
- [ ] 🔨 Batch-compile into `.bbmod` bundles; commit small sample under `/fixtures`.
- [ ] 📝 Draft `manifest.toml` spec (canon, language, licence, versification).

## 3️⃣ Frontend (React 19 + Vite + Radix UI + **shadcn/ui**)

- [ ] ✨ `pnpm create tauri-app` – scaffold Tauri-React template.
- [ ] 🖼️ Build split-pane skeleton: Sidebar ▸ BiblePane ▸ CommentaryPane.
- [ ] 🪄 Install **Tailwind CSS** + **shadcn/ui** presets; add light/dark toggle.
- [ ] 🧩 Implement Radix Tooltip via shadcn for verse hover preview.
- [ ] ⌨️ Wire “Go To Verse” (`⌘/Ctrl + L`) → Rust `invoke("lookup")`.
- [ ] 🔌 Integrate **React Query** for verse-fetch cache.
- [ ] 🌐 Create **Zustand** store (`useLayoutStore`) for pane positions, theme, sidebar.

## 4️⃣ DevOps & Automations

- [ ] 🏗️ GitHub Actions matrix build (Win / macOS / Linux) + notarize macOS.
- [ ] 📦 Draft `tauri.conf.json` for **auto-update** channel “alpha”.
- [ ] ⌚ Nightly workflow: compile latest modules, run DB migrations, publish artifacts.
- [ ] 🌧️ Proof-of-concept **Dropbox sync** task (Rust crate + OAuth).
- [ ] 🔐 Encrypt vault sync with **AES-CBC** before upload.

## 5️⃣ AI Helper Scripts

- [ ] ✏️ Prompt template for GPT “Generate React component docstrings”.
- [ ] 🪛 CI comment-bot that suggests unit tests for new PRs.
- [ ] 🗣️ Spike: natural-language → verse command (`/ask "Blessed are…"`) using core search.

## 6️⃣ UX & Design

- [ ] 🎨 Draft figma / wireframe: 3-pane study workspace + focus reading mode.
- [ ] 💬 Decide default font stack (Noto-Serif + Noto-Sans for multilingual).
- [ ] 🌍 Plan **i18n** pipeline (`react-i18next`, JSON locale files).

## 7️⃣ Docs & Community

- [ ] 📚 `docs/ARCHITECTURE.md` (high-level diagram).
- [ ] 🐣 Write “Setting up dev env” guide (Rust toolchain + pnpm steps).
- [ ] 🤝 Add `CODE_OF_CONDUCT.md` + `CONTRIBUTING.md`.
- [ ] 🗳️ Open GitHub Discussions – seed “Module wishes” & “Design ideas” threads.

## Icebox / Later

- [ ] 🗺️ Map viewer plugin (Leaflet + BiblePlaces KML).
- [ ] 🐑 Liturgy of the Hours feed importer.
- [ ] 📲 Web-WASM edition POC (wasm-pack + SvelteKit static export).
