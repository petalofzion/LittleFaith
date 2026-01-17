# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- Add core crate and frontend package scaffolds.
- Introduce Justfile, pre-commit config, and basic CI.
- Initial documentation and repository scaffolding.
- Clarify automation workflow in AGENTS and CONTRIBUTING.
- Harden CI with conditional test runs and Bun setup.
- Expand PR template and developer docs.
- Switch to modern CI actions with Bun setup and ShellCheck.
- Guard Justfile tasks and seed smoke tests.
- Pin Node and Rust toolchains; tidy README and CONTRIBUTING.
- Fix ShellCheck action version to ensure workflow runs.
- Standardize on Bun for JS tooling.
- Add SQLite schema, lookup, and basic FTS search in core with tests.
- Add module metadata tables, boolean query parsing, and OSIS compiler CLI.
- Add OSIS fixture, compiler integration test, and sample DB size sanity check.
- Switch UI component library to DaisyUI.
- Add OSIS range/multi-ID handling plus module manifest output.
- Rank FTS search results and include snippets in core search API.
- Implement Phase 1 UX shell: Quick Setup, Home, Read, Search, Library, Notes, Settings.
- Apply Little Faith Halo light/dark themes with updated typography.
- Add a frontend smoke test so `bun test` passes.
- Seed a sample module in the Tauri app and expose lookup/search/chapter commands.
- Wire Read/Search views and Go To Verse to the Rust core via Tauri `invoke`.
- Add split-pane reader layout and show actual app data path in Settings.
- Align DaisyUI theme colors with the branding brief and make theme switching apply to html/body.
- Set Halo Gold A as the secondary theme color per the branding palette.
- Define DaisyUI v5 theme variables in CSS and use accent text for highlights on light surfaces.
- Reaffirm cross-platform plan (desktop + web) with a mobile path.
- Add architecture overview and align JS tooling on Bun.
- Add `lf-import-json` for scrollmapper JSON imports and support optional canon in manifests/metadata.
- Add module tooling script with hash-checked downloads and `.bbmod` bundling, plus a sample fixture.
- Document the module `manifest.toml` contract and bundle layout.
- Set Cargo workspace resolver to version 2 to match Rust 2021 crates.
