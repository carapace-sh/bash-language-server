#!/usr/bin/env bash
set -euox pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "export const TREE_SITTER_WASM_BASE64 = \`$(base64 -w 0 "$SCRIPT_DIR/../node_modules/web-tree-sitter/tree-sitter.wasm")\`" > "$SCRIPT_DIR/../src/tree-sitter.ts"
echo "export const TREE_SITTER_BASH_WASM_BASE64 = \`$(base64 -w 0 "$SCRIPT_DIR/../tree-sitter-bash.wasm")\`" > "$SCRIPT_DIR/../src/tree-sitter-bash.ts"