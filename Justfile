# Tasks for LittleFaith

default := test

setup:
	./setup.sh

fmt:
        @if [ -f core/Cargo.toml ]; then cargo fmt --manifest-path core/Cargo.toml; fi
        @pnpm -C frontend --if-present fmt

lint:
        @if [ -f core/Cargo.toml ]; then cargo clippy --manifest-path core/Cargo.toml --all-targets -- -D warnings; fi
        @pnpm -C frontend --if-present lint

test:
        @if [ -f core/Cargo.toml ]; then cargo test --manifest-path core/Cargo.toml; fi
        @pnpm -C frontend --if-present test

pre-commit:
	pre-commit run --all-files
