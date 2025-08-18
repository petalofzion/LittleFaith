# Tasks for LittleFaith

default := test

setup:
	./setup.sh

fmt:
	@if [ -f core/Cargo.toml ]; then cargo fmt --manifest-path core/Cargo.toml; fi
	@npm run fmt --prefix frontend || true

lint:
	@if [ -f core/Cargo.toml ]; then cargo clippy --manifest-path core/Cargo.toml --all-targets -- -D warnings; fi
	@npm run lint --prefix frontend || true

test:
	@if [ -f core/Cargo.toml ]; then cargo test --manifest-path core/Cargo.toml; fi
	@npm test --prefix frontend || true

pre-commit:
	pre-commit run --all-files
