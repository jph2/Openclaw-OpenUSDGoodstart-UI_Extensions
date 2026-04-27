> **Roadmap detail:** This file owns backlog item **6.22** and the current
> Channel Manager UX for Cursor/IDE chat capture. The canonical roadmap entry
> point is [`030_ROADMAP.md`](../030_ROADMAP.md).

# 6.22 — IDE Chat Capture Pipeline (A070)

**Status:** partially shipped · **Last reviewed:** 2026-04-27
**Spec:** [`SPEC_8B5_IDE_MEMORY_BRIDGE.md`](./SPEC_8B5_IDE_MEMORY_BRIDGE.md) §15-§15.10
**Studio runbook:** `Studio_Framework/030_AgentSkills_Dev/002_Cronjobs/020_IDE_chat_capture_A070.md`
**Landing zone:** `Studio_Framework/050_Artifacts/A070_ide_cursor_summaries/`

## Current Product Shape

Channel Manager can capture Cursor `workspaceStorage` only from paths that the
**Node backend host** can read. The browser path and the Windows IDE path are
not magic inputs; the server resolves paths on its own filesystem.

The current Linux/Windows operator flow is:

1. **Step 0 — Terminal on the Linux API host.** Mount or create the readable
   filesystem path. For the Windows PC case, the recommended default is a manual
   CIFS mount of `//<WINDOWS_HOST>/Users` onto `/media/cursor-workspace` using
   explicit `username`, `password`, `uid`, `gid`, `vers=3.0`, and `noserverino`.
2. **Step 1 — Save path (required for normal setups).** Save the POSIX
   `workspaceStorage` directory in Channel Manager, for example
   `/media/cursor-workspace/jan/AppData/Roaming/Cursor/User/workspaceStorage`.
   Step 0 only makes files visible; Step 1 tells the backend where to read.
   The only normal exception is an ops-managed `CURSOR_WORKSPACE_STORAGE_ROOT`
   env override.
3. **Step 2 — Optional `mkdir -p`.** Only needed when the local directory tree
   is missing and the operator did not already create it in Step 0.

The old in-browser SMB wizard is no longer part of the guided process. The
backend API may still expose remote-mount hooks for automation, but the primary
operator path is CLI-first.

## Shipped Slices

- `backend/services/ideChatCapture.js` reads Cursor `workspaceStorage` and
  writes snapshots/manifests under `A070_ide_cursor_summaries/capture/`.
- `GET /api/ide-project-summaries/capture/status` reports the effective
  workspace path, source (`env`, `settings`, `default`), reachability,
  diagnostics, mount status, last run, and saved settings metadata.
- `POST /api/ide-project-summaries/capture/run` and force capture path are live.
- `POST /api/ide-project-summaries/capture/settings` persists the saved
  `workspaceStorageRoot` in `ide_capture_settings.json` when env override is
  unset.
- `POST /api/ide-project-summaries/capture/ensure-path` optionally creates
  missing directories (`mkdir -p`) on Linux.
- Summaries tab UI now shows:
  - Step 0 CLI instructions with editable shell variables.
  - Step 1 required Save path.
  - Saved / Not saved / Last written feedback.
  - Diagnostics that distinguish "path missing" from "path OK".
  - CLI-first Linux mount docs linked from the green Step 0 box.

## Current Known-Good Operator State

For a Windows PC shared via SMB and a Linux backend, a healthy configuration
looks like:

```text
workspaceStorage:
/media/cursor-workspace/<windows-profile>/AppData/Roaming/Cursor/User/workspaceStorage

Diagnostics:
reachable on API host
source: settings
```

If diagnostics show **reachable on API host**, the mount/path problem is solved.
Remaining failures should be debugged as capture extraction, permissions,
snapshot parsing, or downstream summarization problems rather than SMB setup.

## Remaining Work

- **Nightly Studio summary-delta job:** read new manifest lines and append
  concise delta sections to human-facing summaries with RAW path/hash
  provenance.
- **Retention policy:** decide how long to keep RAW snapshots, whether to gzip
  by default, and which paths stay out of git.
- **Other IDE producers:** VS Code-family variants, Codex, OpenCode, Telegram
  and Chat exports should feed the same artifact contract rather than creating
  parallel context systems.
- **First-party local companion / scheduler:** optional future UX for the case
  where the IDE data lives on a PC and CM runs remotely. A PC-side script or
  helper must push snapshots; remote CM cannot pull from an unreachable
  `%APPDATA%` path.
- **Downstream summary integration:** connect capture deltas to the same
  explicit OpenClaw memory promotion flow; no silent `MEMORY.md` writes without
  a later ADR.

## Rules To Preserve

- The Node backend reads from the host where Node runs, not from the browser.
- Mounting and saving are separate steps: Step 0 exposes files; Step 1 persists
  the path.
- Do not run a bare CIFS mount without `-o`; use full credentials and
  permission options.
- Windows/SMB identity and Linux API-host identity are unrelated.
- RAW capture can contain secrets; treat snapshots as sensitive until a
  redaction/retention policy exists.
