#!/bin/bash

# OpenClaw Integration Hook
# This script is called by OpenClaw on startup to auto-start extensions

EXTENSION_DIR="/media/claw-agentbox/data/9999_LocalRepo/OpenClaw_Control_Center"
HOOK_ENABLED_FILE="$EXTENSION_DIR/.auto-start-enabled"

# Check if auto-start is enabled
if [ ! -f "$HOOK_ENABLED_FILE" ]; then
    echo "[OpenClaw Hook] Auto-start disabled (create .auto-start-enabled to enable)"
    exit 0
fi

echo "[OpenClaw Hook] Starting UI Extensions..."
cd "$EXTENSION_DIR" && ./start-extension.sh start > /tmp/openclaw-extension-hook.log 2>&1 &
echo "[OpenClaw Hook] Extensions starting in background"
