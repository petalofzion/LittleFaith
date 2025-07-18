# LittleFaith

LittleFaith is a compact library engine and Bible software that blends desktop-first usability with web-friendly technologies.

## Tech-Stack Quick-Glance
("Desktop-first ❤️, web-friendly ✨, MIT-clean ✓")

### 1. Runtime & UI

| Layer         | Choice                                                        | Why it fits                                                                             |
| ------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Container** | **Tauri 2** (Rust core + system WebView)                     | Tiny binaries (8‑15 MB), 50‑70 % less RAM than Electron, MIT-friendly, easy auto‑update |
| **Frontend**  | **React 19** + **Vite** + **Radix UI** + **shadcn/ui**                       | Rich component ecosystem, hot‑reload, SSR/CSR toggles for future web build              |
| **Styling**   | Tailwind CSS + shadcn/ui components                                  | Rapid kawaii theming, dark/light built‑in                                               |
| **State**     | React Query + Zustand                                         | Decoupled async fetch + lightweight global state                                        |

### 2. Core Logic

| Domain             | Crate / Lib                        | Role                                                         |
| ------------------ | ---------------------------------- | ------------------------------------------------------------ |
| Text Engine        | **Rust** crate `littlefaith-core`  | OSIS → SQLite compiler, verse lookup, search API             |
| Search             | SQLite FTS5 (desktop) → switchable to Tantivy | Millisecond full-text; plug-in swap later for huge libraries |
| Data Sync (opt-in) | `littlefaith-sync` (Rust) w/ Dropbox Web‑API | JSON-delta + AES-CBC encryption of user vault                |

### 3. Storage Layout

```
%APPDATA%/LittleFaith/
 ├─ Modules/        (read-only .bbmod SQLite bundles)
 ├─ UserVault.db    (notes/highlights/journal – encrypted)
 └─ Cache/          (thumbnail & search indexes)
```

### 4. Plugin Surface

```
trait LittleFaithPlugin {
    fn manifest(&self) -> PluginManifest;
    fn register(api: &mut CoreApi);
}
```

Rust dynamic-load or WASI. Examples: AI-chat assistant, Qur'an module, map viewer.

### 5. Build & CI

* **Cargo** workspaces → `cargo tauri build`
* **Vitest + Jest** for UI tests
* GitHub Actions: lint, unit-tests, cross-compile (Win/macOS/Linux), notarize Mac.

### 6. Release Footprint

* **Windows**: `LittleFaith-Setup-x64.exe` ≈ 12 MB
* **macOS**: `.dmg` signed, universal 14 MB
* **Linux**: `.AppImage` 13 MB

### 7. Road to Web & Mobile

* **Web**: Same React code in Vite → deploy as PWA; point to WASM-compiled `littlefaith-core` (via `wasm-pack`).
* **Mobile**: Capacitor wrapper later; or Flutter rewrite if full native is desired.

## Development Setup

Run `./setup.sh` to install Rust, Node.js, pnpm and the Tauri CLI. The script only installs missing tools.
After running it, you can build the app with `cargo tauri dev` once the source code is available.

---

LittleFaith aims for minimal footprint today with cathedral-level extensibility tomorrow.
