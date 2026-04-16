# OpenClaw Control Center

Repository layout (top level, intentionally minimal):

| Folder | Role |
|--------|--------|
| **`Production_Nodejs_React/`** | Main product: Control Center backend (Express), frontend (Vite/React), and Channel Manager features backed by this stack. |
| **`Backend_MCP/`** | MCP server and related backend tooling integrated with the Control Center. |
| **`Prototyp/`** | Legacy / prototype surfaces: workbench MVP (Express + static UI), landing hub, old `channel_CHAT-manager` UI, mobile workbench prototype, and helper scripts (`occ-ctl.mjs`, `start-extension.sh`, etc.). |

Prototype assets were consolidated here so the repository root stays easy to navigate; production code paths that still read `channel_config.json` and related files now use **`Prototyp/channel_CHAT-manager/`**.

## Production app

```bash
cd Production_Nodejs_React/backend && npm install && npm run dev   # API (default 3000)
cd Production_Nodejs_React/frontend && npm install && npm run dev    # Vite (default 5173)
```

Optional: run backend + frontend + prototype workbench together from the repo root:

```bash
node Prototyp/occ-ctl.mjs start
node Prototyp/occ-ctl.mjs status
node Prototyp/occ-ctl.mjs stop
```

`Prototyp/occ-ctl.mjs` resolves `Production_Nodejs_React/` and `Prototyp/` relative to the repository root.

**Backend env:** `Production_Nodejs_React/backend` expects **`WORKSPACE_ROOT`** (absolute path to the parent of `OpenClaw_Control_Center`, e.g. `…/9999_LocalRepo`). Set it in your shell or `.env` next to the backend so `occ-ctl`-spawned processes inherit it. Optional: **`STUDIO_FRAMEWORK_ROOT`** for `GET /api/summaries` and **`/api/ide-project-summaries`** (Alias, gleicher Router; defaults to `WORKSPACE_ROOT/Studio_Framework`).

## Documentation map (Channel Manager & bridges)

| Doc | Purpose |
|-----|----------------|
| [Production_Nodejs_React/CHANNEL_MANAGER_DOCUMENTATION_16-04-2026.md](Production_Nodejs_React/CHANNEL_MANAGER_DOCUMENTATION_16-04-2026.md) | Consolidated master documentation (architecture, stabilization, IDE bridge, TARS-only UI) |
| [Production_Nodejs_React/CHANNEL_MANAGER_IMPLEMENTATION_PLAN.md](Production_Nodejs_React/CHANNEL_MANAGER_IMPLEMENTATION_PLAN.md) | Phased tasks, sub-task status |
| [Production_Nodejs_React/CHANNEL_MANAGER_SPECIFICATION.md](Production_Nodejs_React/CHANNEL_MANAGER_SPECIFICATION.md) | Architecture, gateway-first, tabs |
| [Production_Nodejs_React/CHANNEL_MANAGER_SCOPE_MVP_2026-04-15.md](Production_Nodejs_React/CHANNEL_MANAGER_SCOPE_MVP_2026-04-15.md) | MVP scope (Chat mirror / Summary) |
| [Production_Nodejs_React/CHANNEL_MANAGER_IDE_BRIDGE_DISCOVERY.md](Production_Nodejs_React/CHANNEL_MANAGER_IDE_BRIDGE_DISCOVERY.md) | OpenClaw vs IDE workbench projections, `ideConfigBridge` |

**Read-only APIs (production backend):** `GET /api/summaries`, `GET /api/ide-project-summaries`, `GET /api/summaries/file`, `GET /api/exports/canonical|openclaw|ide|cursor` — see Implementation Plan §6.10 / §6.12 and master doc §2.9.

## Prototype stack (Workbench + landing + legacy Channel Manager UI)

```bash
cd Prototyp
npm install           # once — Express + marked for the workbench server
./start-extension.sh start   # workbench :4260, channel_CHAT-manager :3402, landing :8080
```

Or workbench only:

```bash
cd Prototyp && npm start    # http://localhost:4260
```

Open the landing page directly:

`file:///media/claw-agentbox/data/9999_LocalRepo/OpenClaw_Control_Center/Prototyp/index.html`

### systemd (optional)

After moving paths, point the unit at `Prototyp`:

```bash
sudo cp Prototyp/openclaw-extensions.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable openclaw-extensions
sudo systemctl start openclaw-extensions
```

### OpenClaw hook

If you use `.auto-start-enabled` beside `start-extension.sh`, it lives under **`Prototyp/`**. Example manual run:

```bash
touch Prototyp/.auto-start-enabled
./Prototyp/openclaw-hook.sh
```

**Note:** Update `EXTENSION_DIR` in `Prototyp/openclaw-hook.sh` if your clone path differs.

## Repository (Git remote)

- **SSH:** `git@github.com:jph2/OpenClaw_Control_Center.git`
- **HTTPS:** `https://github.com/jph2/OpenClaw_Control_Center.git`

## Safety notes

The prototype workbench restricts file access to approved root directories. The production app enforces its own path-safety rules on `/api/workbench/*` routes.
