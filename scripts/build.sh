#!/usr/bin/env bash
# Build the kb binary and optionally install it.
# Usage: ./scripts/build.sh           # build only
#        ./scripts/build.sh install   # build + install to ~/.local/bin

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BINARY="$PROJECT_DIR/kb"
INSTALL_DIR="${KB_INSTALL_DIR:-$HOME/.local/bin}"

echo "Building kb binary..."
bun build --compile "$PROJECT_DIR/src/cli.ts" --outfile "$BINARY"

# Show binary size
SIZE=$(du -h "$BINARY" | cut -f1)
echo "Built: $BINARY ($SIZE)"

if [ "${1:-}" = "install" ]; then
    mkdir -p "$INSTALL_DIR"
    cp "$BINARY" "$INSTALL_DIR/kb"
    echo "Installed: $INSTALL_DIR/kb"

    # Check if install dir is in PATH
    if ! echo "$PATH" | tr ':' '\n' | grep -q "^$INSTALL_DIR$"; then
        echo ""
        echo "NOTE: $INSTALL_DIR is not in your PATH."
        echo "Add this to your shell config:"
        echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
    fi
fi
