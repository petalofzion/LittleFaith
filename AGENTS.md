# Repo Guidelines for Codex Agents

Welcome! This repository currently contains documentation only. As the project grows, code and tests will be added.

## Programmatic Checks
- If a `Cargo.toml` file exists, run `cargo test`.
- If a `package.json` file exists, run `npm test`.
- If neither exists, no checks are required.

## Documentation Style
- Keep lines under 120 characters when possible.
- Use Markdown headings and lists where appropriate.

## Automation Workflow
- Run `./setup.sh` to install required tools before building.
- Update `TODO.md` as tasks are completed or added.
- Document notable changes in `CHANGELOG.md` under the "Unreleased" section.
- Keep commit messages and PR descriptions clear for automated summaries.
- Keep `setup.sh` and any tests current as improvements are discovered.

