# Tasks for LittleFaith

default := test

setup:
	./setup.sh

fmt:
        @if [ -f core/Cargo.toml ]; then cargo fmt --manifest-path core/Cargo.toml; fi
       @bun run --cwd frontend fmt

lint:
        @if [ -f core/Cargo.toml ]; then cargo clippy --manifest-path core/Cargo.toml --all-targets -- -D warnings; fi
       @bun run --cwd frontend lint

test:
        @if [ -f core/Cargo.toml ]; then cargo test --manifest-path core/Cargo.toml; fi
       @bun run --cwd frontend test

pre-commit:
	pre-commit run --all-files
