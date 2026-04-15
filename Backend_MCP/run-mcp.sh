#!/usr/bin/env bash
# MCP stdio entrypoint for Cursor on Windows: ssh -T laptop /path/to/run-mcp.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
exec /usr/bin/node "$DIR/MCP-ChannelManager.mjs"
