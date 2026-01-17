# Development Setup

## Requirements

- Rust toolchain (managed by `setup.sh`)
- Bun for JavaScript tooling (managed by `setup.sh`)
- Tauri CLI (managed by `setup.sh`)

Tauri also needs platform dependencies for your OS. See the Tauri prerequisites for your platform.

## Quick Start

1. Run `./setup.sh`.
2. Install frontend deps: `bun install --cwd frontend`.
3. Run the desktop app: `cargo tauri dev` (this starts the Bun dev server).

## Notes

- The dev server binds to `http://localhost:5173` for Tauri.
- The web build is produced by `bun run --cwd frontend build`.
- Tauri uses `src-tauri/tauri.conf.json` for configuration.

## Module tooling

Module downloads and bundling use `python3` (stdlib only).

- Download sources: `python3 scripts/modules.py download`
- Build `.bbmod` bundles: `python3 scripts/modules.py build`
- Regenerate the sample fixture: `python3 scripts/modules.py fixture`
