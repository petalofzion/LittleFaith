# Contributing to LittleFaith

Thank you for considering contributing to LittleFaith!

## Development Setup

1. Run `./setup.sh` to install Rust, Node and the Tauri CLI.
2. Clone the repository and install JavaScript dependencies with `npm install` if a `package.json` exists.
3. Build the desktop app using `cargo tauri dev`.

If you add new dependencies or tools, update `setup.sh` so others can reproduce the environment.

## Workflow
- Use `TODO.md` to track tasks and check off completed items.
- Document user-facing changes in `CHANGELOG.md`.
- Keep docs and comments concise so automated tools can summarize them.
- Update tests and `setup.sh` whenever you improve the development workflow.

## Pull Requests

* Keep PRs focused and describe your changes clearly.
* For code changes, add tests where possible.
* Ensure `cargo test` and `npm test` pass before submitting.

## Communication

Feel free to open discussions or issues for questions and suggestions.
