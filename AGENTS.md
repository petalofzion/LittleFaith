# Repo Guidelines for Codex Agents

Welcome! This repository currently contains documentation only. As the project grows, code and tests will be added.

## Programmatic Checks
- If a `Cargo.toml` file exists, run `cargo test`.
- If a `package.json` file exists, run `bun test`.
- If neither exists, no checks are required.

## Documentation Style
- Keep lines under 120 characters when possible.
- Use Markdown headings and lists where appropriate.

## UI + Theming
- Use DaisyUI semantic utilities (e.g., `bg-primary`, `text-base-content`) instead of hard-coded colors.
- Define custom themes via CSS variables in `frontend/src/index.css` for DaisyUI v5 (light/dark).
- Apply themes by setting `data-theme` on the `<html>` element (and `<body>` where needed).
- Avoid gold text on light surfaces; use the darker accent for link text on light backgrounds.

## Automation Workflow
- Run `./setup.sh` to install required tools before building.
- Update `TODO.md` as tasks are completed or added.
- After each task, review `TODO.md`, check off completed items, and adjust entries for accuracy.
- Document notable changes in `CHANGELOG.md` under the "Unreleased" section.
- Keep commit messages and PR descriptions clear for automated summaries.
- Keep `setup.sh` and any tests current as improvements are discovered.
