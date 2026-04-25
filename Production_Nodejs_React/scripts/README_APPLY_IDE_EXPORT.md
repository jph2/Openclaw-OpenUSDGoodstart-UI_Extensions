# Apply IDE export (B — Cursor `.cursor/agents`)

Materializes **Subagent** stubs from Channel Manager into a target repo’s `.cursor/agents/*.md`.

- **Source of truth:** `Prototyp/channel_CHAT-manager/channel_config.json` (and CM UI).
- **Does not** write `~/.cursor` — only the path you pass as `--target`.
- **Safe default:** existing agent files **without** the CM marker line are **skipped** unless you pass `--force`.

## From local config (no running server)

Set `WORKSPACE_ROOT` to the parent of `OpenClaw_Control_Center` (same as backend), then:

```bash
cd Production_Nodejs_React/backend
export WORKSPACE_ROOT=/path/to/parent-of-OpenClaw_Control_Center

npm run apply-ide-export -- --dry-run --target /path/to/Studio_Framework
npm run apply-ide-export -- --write --target /path/to/Studio_Framework
```

Or pass an explicit config:

```bash
node ../scripts/apply-ide-export.mjs --write --target /path/to/repo \
  --config /path/to/OpenClaw_Control_Center/Prototyp/channel_CHAT-manager/channel_config.json
```

## From running Channel Manager API

```bash
node scripts/apply-ide-export.mjs --write --target /path/to/repo \
  --api-base http://127.0.0.1:3000
```

## Workflow

1. Edit agents/subagents/skills in CM → **Apply to OpenClaw** as usual.
2. Run this script with `--dry-run`, review the list.
3. Run with `--write`, then **commit** the `.cursor/agents` diff in the IDE repo.

## Stale check (CI / pre-commit)

After `--write`, `.cursor/cm-ide-export-fingerprint.json` records a hash of the CM bundle (engines + sub-agents + skill ids). If `channel_config.json` changes but you forgot to re-run apply:

```bash
cd Production_Nodejs_React/backend
export WORKSPACE_ROOT=/path/to/parent-of-OpenClaw_Control_Center
npm run check-ide-export-stale -- --target /path/to/Studio_Framework
```

- Exit **0** — fingerprint matches current CM.
- Exit **1** — stale; re-run apply.
- Exit **2** — no fingerprint file yet (run `--write` once).

## Marker line

Generated files start with:

`<!-- cm-ide-export:v1 managed-by-channel-manager-apply-script -->`

Custom agent docs without this line are not overwritten unless `--force`.
