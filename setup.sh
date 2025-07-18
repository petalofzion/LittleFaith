#!/usr/bin/env bash
# LittleFaith development environment setup
set -e

# Ensure the script works from repo root
cd "$(dirname "$0")"

install_rust() {
    if ! command -v cargo >/dev/null 2>&1; then
        echo "Installing Rust toolchain..."
        curl https://sh.rustup.rs -sSf | sh -s -- -y
        source "$HOME/.cargo/env"
    else
        echo "Rust already installed: $(rustc --version)"
    fi
}

install_node() {
    if ! command -v node >/dev/null 2>&1; then
        echo "Installing Node via nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \ . "$NVM_DIR/nvm.sh"
        nvm install --lts
    else
        echo "Node already installed: $(node --version)"
    fi
}

install_pnpm() {
    if ! command -v pnpm >/dev/null 2>&1; then
        echo "Installing pnpm..."
        npm install -g pnpm
    else
        echo "pnpm already installed: $(pnpm --version)"
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
install_node
install_pnpm
install_tauri

echo "Setup complete."
