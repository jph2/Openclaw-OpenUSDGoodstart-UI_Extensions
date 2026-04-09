#!/bin/bash

# Service Monitor - Auto-restart crashed services

PID_DIR="/tmp/openclaw-extensions"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /tmp/extension-monitor.log
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

check_and_restart() {
    local service=$1
    local port=$2
    local pidfile="$PID_DIR/$service.pid"
    
    # Check if process is running
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if ! kill -0 "$pid" 2>/dev/null; then
            log "⚠️ $service (PID: $pid) not running - restarting..."
            rm -f "$pidfile"
            restart_service "$service"
        fi
    else
        # No pidfile but maybe service is running on port
        if ! curl -s "http://localhost:$port/" > /dev/null 2>&1; then
            log "⚠️ $service not responding on port $port - restarting..."
            restart_service "$service"
        fi
    fi
}

restart_service() {
    local service=$1
    
    case "$service" in
        workbench)
            cd "$SCRIPT_DIR" && npm start > /tmp/workbench.log 2>&1 &
            echo $! > "$PID_DIR/workbench.pid"
            log "✅ Workbench restarted"
            ;;
        channel-manager)
            cd "$SCRIPT_DIR/channel-manager" && node server.js > /tmp/channel-manager.log 2>&1 &
            echo $! > "$PID_DIR/channel-manager.pid"
            log "✅ Channel Manager restarted"
            ;;
        landing)
            cd "$SCRIPT_DIR" && node landing-server.js > /tmp/landing.log 2>&1 &
            echo $! > "$PID_DIR/landing.pid"
            log "✅ Landing Page restarted"
            ;;
    esac
}

# Main loop
log "=== Service Monitor Started ==="

while true; do
    check_and_restart "workbench" 4260
    check_and_restart "channel-manager" 3401
    check_and_restart "landing" 8080
    
    sleep 10
done
