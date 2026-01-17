#!/usr/bin/env bash
# LittleFaith development environment setup
# Keep this script updated when new tools are needed.
set -e

# Ensure the script works from repo root
cd "$(dirname "$0")"

install_rust() {
    if ! command -v cargo >/dev/null 2>&1; then
        echo "Installing Rust toolchain..."
        curl https://sh.rustup.rs -sSf | sh -s -- -y
        # shellcheck source=/dev/null
        source "$HOME/.cargo/env"
    else
        echo "Rust already installed: $(rustc --version)"
    fi
}


install_bun() {
    if ! command -v bun >/dev/null 2>&1; then
        echo "Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
    else
        echo "Bun already installed: $(bun --version)"
    fi
}

install_tauri() {
    if ! command -v cargo-tauri >/dev/null 2>&1; then
        echo "Installing Tauri CLI..."
        cargo install tauri-cli
    else
        echo "Tauri CLI already installed: $(cargo tauri --version)"
    fi
}

install_rust
install_bun
install_tauri

echo "Setup complete."
