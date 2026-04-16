---
arys_schema_version: "1.3"
id: "occ-scope-mvp-2026-04-15"
title: "OpenClaw Control Center — Scope Change (MVP, April 2026)"
type: PRACTICAL
status: active
trust_level: 3
created: "2026-04-15T18:00:00Z"
last_modified: "2026-04-16T21:00:00Z"
author: "Studio + OpenClaw"
provenance:
  git_repo: "OpenClaw_Control_Center"
  git_branch: "main"
  git_path: "Production_Nodejs_React/CHANNEL_MANAGER_SCOPE_MVP_2026-04-15.md"
tags: [channel_manager, mvp, scope, cursor, openclaw]
---

# Channel Manager — Scope Change (MVP, 15.04.2026)

**GlobalID:** 20260415_1800_SCOPE_MVP_v1

## Kontext

Es gibt **zwei** konzeptionelle Zielbilder (A: IDE liefert Verdichtung; B: IDE wird vom CM bedient) plus eine **bisherige Mixtur**. Um **ohne Doppelreaktionen** produktiv zu werden, wird der **Channel Manager** im MVP **entschärft**: er bleibt **Konfigurations-Hub** und **Spiegel** der OpenClaw-Telegram-Welt — **nicht** die zentrale Chat-Oberfläche für „alles gleichzeitig“ (IDE + OpenClaw + Telegram).

## Neu: Tab-Modell (Umsetzung Phase 1 / 16.04.2026)

| Tab | Funktion |
|-----|----------|
| **Configuration** | Wie bisher: Kanäle (TG), Modelle, Skills, Agenten/Subagenten. |
| **OpenClaw Chat** | **Live:** Gateway-gespiegelter Verlauf (SSE), gebunden an die gewählte Gruppe — gleicher Stream wie OpenClaw Web; kein zweiter Sendepfad. |
| **Cursor Summary** | **Teil-MVP:** Listet & zeigt Markdown aus **A070** (`GET /api/summaries` unter `STUDIO_FRAMEWORK_ROOT`); Filter optional per `telegramId` im Pfad. Schreiben/Promotion nach `memory/` weiterhin backlog. |

**Zusatz:** Dual-Export-API (`/api/exports/*`) + `ideConfigBridge` für Projektionen nach OpenClaw vs Cursor — siehe [CHANNEL_MANAGER_IDE_BRIDGE_DISCOVERY.md](CHANNEL_MANAGER_IDE_BRIDGE_DISCOVERY.md).

## UX-Ergänzungen (16.04.2026, MVP-kompatibel)

| Thema | Kurz |
|-------|------|
| **Workbench** | Mehrere erlaubte Dateiwurzeln (Workspace, gebündelte OpenClaw-Skills, User-Home, optional `/`); Deep-Link `?path=` bleibt nach `localStorage`-Hydration gültig — **„EDIT in Workbench ➔“** öffnet den Skill zuverlässig. Siehe Master-Doku §2.10, Spec §3.2d. |
| **Skill-Badges** | Effektive Liste: Kanal → **Sub-Agents** → Hauptagent; bei doppelter Skill-ID zeigt die UI die **Sub-Agent-Quelle** mit Namen (**Inherited from {Name} · sub-agent**). Spec §3.2c. |

## Rollen / Labels (Abgleich mit Harness)

- **Triade (OpenClaw):** **TARS** (Thesis), **MARVIN** (Antithesis), **CASE** (Synthesis / Umsetzung). **SONIC** wird durch **CASE** ersetzt. In der **IDE** wird **TARS** normal genutzt; **Wechsel** zwischen Harness-Charakteren (TARS / MARVIN / CASE / …) ist möglich — **CASE** ist damit **nicht** „nur IDE-Spur“. Die früher **separat** geführte CASE-Parallel-Seele wird ins **OpenClaw-Workspace-Archiv** überführt (keine zweite aktive Harness-SOUL).  
- UI-Label im Channel Manager: **„TARS in IDE“** — **nicht** „CASE SKILLS“ / „CASE skills (relay)“ als verwirrender Parallel-Begriff. **Umsetzung:** dieselbe Bezeichnung erscheint (1) als **Abschnittstitel unter der Skill-Liste** im Configuration-Workspace (Relay-Skills für die IDE-Spur) und (2) als **Beschriftung unten links** in der Kanal-Spalte — damit ist klar definiert, welche Skills dort gemeint sind.



## Explizit out of scope (MVP)

- Channel Manager als **einzige** Chat-Oberfläche, die **parallel** dieselbe Absicht an IDE **und** OpenClaw **sendet** (Doppelantworten).  
- Vollständiger Ersatz des OpenClaw-Web-Chats — wer dort arbeitet, bleibt dort; **OpenClaw Chat** im CM ist der **Spiegel**, nicht der Konkurrent, alle Inhalte werden 1 zu 1 vom OpenClaw-Web-Chats übertragen.

## Nächste technische Schritte (kurz)

1. Frontend: Tabs **OpenClaw Chat** | **Cursor Summary** (Summary zunächst Platzhalter oder MD-Liste aus konfigurierbarem Pfad).  
2. Skills: `memory`- / Summary-Pipeline für IDE → `A070_ide_cursor_summaries/` (Studio) + `memory/` (OpenClaw).  
3. Spec: `CHANNEL_MANAGER_SPECIFICATION.md` — Verweis auf dieses Dokument als **Scope-of-Record**.

---
*Status: Scope-of-Record für MVP-Entscheidung; UI-Implementierung kann inkrementell folgen. **16.04.2026:** Workbench + Skill-Herkunft-UX in Spec/Doku/Plan referenziert (§2.10, §3.2c–d, R6, Sub-Task 6.14).*
