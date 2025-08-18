# Tasks for LittleFaith

default := test

setup:
    ./setup.sh

fmt:
    cargo fmt --manifest-path core/Cargo.toml
    npm run fmt --prefix frontend

lint:
    cargo clippy --manifest-path core/Cargo.toml --all-targets -- -D warnings
    npm run lint --prefix frontend

test:
    cargo test --manifest-path core/Cargo.toml
    npm test --prefix frontend
