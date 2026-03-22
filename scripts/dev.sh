#!/usr/bin/env bash
# Run kb commands against the local .tmp/ test environment.
# Usage: ./scripts/dev.sh init
#        ./scripts/dev.sh add task "Fix bug" --project alpha
#        ./scripts/dev.sh search "auth"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TMP_DIR="$PROJECT_DIR/.tmp"
TMP_KB="$TMP_DIR/kb"
TMP_CONFIG="$TMP_DIR/config"

# Ensure .tmp dirs exist
mkdir -p "$TMP_KB" "$TMP_CONFIG"

# Point global config at our local test config dir
export KB_GLOBAL_CONFIG_DIR="$TMP_CONFIG"

# If the command is "init", init into .tmp/kb
if [ "${1:-}" = "init" ]; then
    shift
    exec bun run "$PROJECT_DIR/src/cli.ts" init "$TMP_KB" "$@"
fi

# If the command is "reset", wipe .tmp and re-init
if [ "${1:-}" = "reset" ]; then
    echo "Resetting .tmp/ test environment..."
    rm -rf "$TMP_KB" "$TMP_CONFIG"
    mkdir -p "$TMP_KB" "$TMP_CONFIG"
    exec bun run "$PROJECT_DIR/src/cli.ts" init "$TMP_KB"
fi

# If the command is "ls-files", just list what's in the test KB
if [ "${1:-}" = "ls-files" ]; then
    ls -1 "$TMP_KB"/*.md 2>/dev/null || echo "(no files)"
    exit 0
fi

# Otherwise, pass through to the CLI
exec bun run "$PROJECT_DIR/src/cli.ts" "$@"
