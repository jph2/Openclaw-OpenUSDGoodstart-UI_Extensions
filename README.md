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
