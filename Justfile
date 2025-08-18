# Tasks for LittleFaith

default := test

setup:
    ./setup.sh

fmt:
    if [ -f core/Cargo.toml ]; then cargo fmt --manifest-path core/Cargo.toml; fi
    if [ -f frontend/package.json ]; then pnpm -C frontend fmt; fi

lint:
    if [ -f core/Cargo.toml ]; then cargo clippy --manifest-path core/Cargo.toml --all-targets -- -D warnings; fi
    if [ -f frontend/package.json ]; then pnpm -C frontend lint; fi

test:
    if [ -f core/Cargo.toml ]; then cargo test --manifest-path core/Cargo.toml; fi
    if [ -f frontend/package.json ]; then pnpm -C frontend test; fi

pre-commit:
    pre-commit run --all-files
