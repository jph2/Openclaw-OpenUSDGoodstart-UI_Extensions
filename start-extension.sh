#!/bin/bash

# OpenClaw UI Extensions - Auto-Start Script
# This script starts all extension services

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="/tmp/openclaw-extensions"

mkdir -p "$PID_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

start_workbench() {
    local pidfile="$PID_DIR/workbench.pid"
    
    if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
        log "Workbench already running (PID: $(cat "$pidfile"))"
        return 0
    fi
    
    log "Starting Workbench..."
    cd "$SCRIPT_DIR" && npm start > /tmp/workbench.log 2>&1 &
    echo $! > "$pidfile"
    
    # Wait for server to be ready
    for i in {1..30}; do
        if curl -s http://localhost:4260 > /dev/null 2>&1; then
            log "✅ Workbench ready on http://localhost:4260"
            return 0
        fi
        sleep 1
    done
    
    log "❌ Workbench failed to start (check /tmp/workbench.log)"
    return 1
}

start_channel_manager() {
    local pidfile="$PID_DIR/channel-manager.pid"
    
    if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
        log "Channel Manager already running (PID: $(cat "$pidfile"))"
        return 0
    fi
    
    log "Starting Channel Manager..."
    cd "$SCRIPT_DIR/channel-manager" && node server.js > /tmp/channel-manager.log 2>&1 &
    echo $! > "$pidfile"
    
    # Wait for server to be ready
    for i in {1..30}; do
        if curl -s http://localhost:3401 > /dev/null 2>&1; then
            log "✅ Channel Manager ready on http://localhost:3401"
            return 0
        fi
        sleep 1
    done
    
    log "❌ Channel Manager failed to start (check /tmp/channel-manager.log)"
    return 1
}

start_landing() {
    log "Opening landing page..."
    
    # Try to open browser
    local landing_url="file://$SCRIPT_DIR/index.html"
    
    if command -v xdg-open &> /dev/null; then
        xdg-open "$landing_url" &
    elif command -v open &> /dev/null; then
        open "$landing_url" &
    elif command -v firefox &> /dev/null; then
        firefox "$landing_url" &
    elif command -v chromium &> /dev/null; then
        chromium "$landing_url" &
    else
        log "📄 Open landing page: $landing_url"
    fi
}

stop_all() {
    log "Stopping all services..."
    
    for service in workbench channel-manager; do
        local pidfile="$PID_DIR/$service.pid"
        if [ -f "$pidfile" ]; then
            local pid=$(cat "$pidfile")
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null
                log "Stopped $service (PID: $pid)"
            fi
            rm -f "$pidfile"
        fi
    done
    
    log "✅ All services stopped"
}

status() {
    log "Extension Status:"
    
    for service in workbench channel-manager; do
        local pidfile="$PID_DIR/$service.pid"
        local port=$( [ "$service" = "workbench" ] && echo "4260" || echo "3401" )
        
        if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
            log "  $service: ✅ Running (PID: $(cat "$pidfile"), Port: $port)"
        else
            log "  $service: ❌ Stopped (Port: $port)"
        fi
    done
}

# Main
case "${1:-start}" in
    start)
        log "=== Starting OpenClaw UI Extensions ==="
        start_workbench
        start_channel_manager
        start_landing
        log "=== All services started ==="
        log ""
        log "📁 Workbench:      http://localhost:4260"
        log "📺 Channel Manager: http://localhost:3401"
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 2
        $0 start
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 [start|stop|restart|status]"
        echo ""
        echo "Commands:"
        echo "  start   - Start all extension services"
        echo "  stop    - Stop all extension services"
        echo "  restart - Restart all extension services"
        echo "  status  - Check service status"
        ;;
esac
