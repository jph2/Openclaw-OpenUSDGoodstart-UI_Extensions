#!/usr/bin/env bash
# Mount Windows Cursor workspaceStorage on a Linux host (SMB/CIFS or sshfs) so the
# Channel Manager API can read workspaceStorage at a POSIX path.
#
# Usage: ide-capture-remote-mount.sh mount|umount|status
#
# Required for all actions:
#   IDE_CAPTURE_MOUNT_POINT   Absolute directory (e.g. /media/cursor-ws)
#
# Mode SMB (default IDE_CAPTURE_REMOTE_MODE=smb):
#   IDE_CAPTURE_SMB_UNC="//HOST/Share"     e.g. //192.168.1.10/Users
#   or IDE_CAPTURE_SMB_SERVER + IDE_CAPTURE_SMB_SHARE (builds //SERVER/SHARE)
#   Optional: IDE_CAPTURE_SMB_CREDENTIALS  path to smb credentials file (username=/password=)
#   Optional: IDE_CAPTURE_SMB_EXTRA_OPTS   extra -o for mount.cifs (comma-separated)
#
# Mode sshfs (IDE_CAPTURE_REMOTE_MODE=sshfs):
#   IDE_CAPTURE_SSHFS_TARGET="user@host:/remote/path"
#
# Examples:
#   export IDE_CAPTURE_MOUNT_POINT=/media/cursor-ws
#   export IDE_CAPTURE_REMOTE_MODE=smb
#   export IDE_CAPTURE_SMB_UNC="//pc.jan.local/Users"
#   export IDE_CAPTURE_SMB_CREDENTIALS="$HOME/.smb-cursor-creds"
#   ./scripts/ide-capture-remote-mount.sh mount
#
#   export IDE_CAPTURE_REMOTE_MODE=sshfs
#   export IDE_CAPTURE_SSHFS_TARGET="jan@windows-pc:/Users/jan/AppData/Roaming/Cursor/User/workspaceStorage"
#   ./scripts/ide-capture-remote-mount.sh mount
#
set -euo pipefail

ACTION="${1:-}"

require_mp() {
    if [[ -z "${IDE_CAPTURE_MOUNT_POINT:-}" ]]; then
        echo "IDE_CAPTURE_MOUNT_POINT must be set (absolute mount directory)" >&2
        exit 1
    fi
    if [[ "${IDE_CAPTURE_MOUNT_POINT}" != /* ]]; then
        echo "IDE_CAPTURE_MOUNT_POINT must be an absolute path" >&2
        exit 1
    fi
}

is_mounted() {
    local mp="$1"
    if command -v mountpoint >/dev/null 2>&1; then
        mountpoint -q "$mp"
        return $?
    fi
    if command -v findmnt >/dev/null 2>&1; then
        findmnt -n "$mp" >/dev/null 2>&1
        return $?
    fi
    echo "Need mountpoint or findmnt to check mount state" >&2
    return 2
}

case "${ACTION}" in
    status)
        require_mp
        MP="${IDE_CAPTURE_MOUNT_POINT}"
        if is_mounted "$MP"; then
            echo "mounted: ${MP}"
            command -v findmnt >/dev/null 2>&1 && findmnt "$MP" || true
            exit 0
        fi
        echo "not mounted: ${MP}" >&2
        exit 1
        ;;
    umount)
        require_mp
        MP="${IDE_CAPTURE_MOUNT_POINT}"
        if ! is_mounted "$MP"; then
            echo "already not mounted: ${MP}"
            exit 0
        fi
        FST=""
        if command -v findmnt >/dev/null 2>&1; then
            FST="$(findmnt -n -o FSTYPE "$MP" 2>/dev/null || true)"
        fi
        if [[ "$FST" == *sshfs* ]] && command -v fusermount >/dev/null 2>&1; then
            fusermount -u "$MP" || umount "$MP"
        else
            umount "$MP"
        fi
        echo "unmounted: ${MP}"
        ;;
    mount)
        require_mp
        MP="${IDE_CAPTURE_MOUNT_POINT}"
        mkdir -p "$MP"
        MODE="${IDE_CAPTURE_REMOTE_MODE:-smb}"

        if is_mounted "$MP"; then
            echo "already mounted: ${MP}"
            exit 0
        fi

        if [[ "$MODE" == "sshfs" ]]; then
            T="${IDE_CAPTURE_SSHFS_TARGET:-}"
            if [[ -z "$T" ]]; then
                echo "IDE_CAPTURE_SSHFS_TARGET is required for sshfs (e.g. user@host:/path)" >&2
                exit 1
            fi
            if ! command -v sshfs >/dev/null 2>&1; then
                echo "sshfs not installed (package sshfs on Debian/Ubuntu)" >&2
                exit 1
            fi
            exec sshfs -o reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 "${T}" "${MP}"
        fi

        UNC="${IDE_CAPTURE_SMB_UNC:-}"
        if [[ -z "$UNC" ]]; then
            S="${IDE_CAPTURE_SMB_SERVER:-}"
            SH="${IDE_CAPTURE_SMB_SHARE:-}"
            if [[ -n "$S" && -n "$SH" ]]; then
                UNC="//${S}/${SH}"
            fi
        fi
        if [[ -z "$UNC" ]]; then
            echo "SMB: set IDE_CAPTURE_SMB_UNC or IDE_CAPTURE_SMB_SERVER and IDE_CAPTURE_SMB_SHARE" >&2
            exit 1
        fi

        OPTS="vers=3.0,noserverino,uid=$(id -u),gid=$(id -g),file_mode=0640,dir_mode=0750"
        if [[ -n "${IDE_CAPTURE_SMB_CREDENTIALS:-}" ]]; then
            OPTS="${OPTS},credentials=${IDE_CAPTURE_SMB_CREDENTIALS}"
        fi
        if [[ -n "${IDE_CAPTURE_SMB_EXTRA_OPTS:-}" ]]; then
            OPTS="${OPTS},${IDE_CAPTURE_SMB_EXTRA_OPTS}"
        fi

        # May require root or CAP_SYS_ADMIN + fstab helper; try plain mount first.
        exec mount -t cifs "${UNC}" "${MP}" -o "${OPTS}"
        ;;
    *)
        echo "Usage: $0 mount|umount|status" >&2
        echo "See comments in script for IDE_CAPTURE_* variables." >&2
        exit 1
        ;;
esac
