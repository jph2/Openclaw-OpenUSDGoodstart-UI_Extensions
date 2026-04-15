---
arys_schema_version: "1.3"
id: "occ-scope-mvp-2026-04-15"
title: "OpenClaw Control Center — Scope Change (MVP, April 2026)"
type: PRACTICAL
status: active
trust_level: 3
created: "2026-04-15T18:00:00Z"
last_modified: "2026-04-15T19:30:00Z"
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

## Neu: Tab-Modell (geplant / UI)

| Tab | Funktion |
|-----|----------|
| **Configuration** | Wie bisher: Kanäle (TG), Modelle, Skills, Agenten/Subagenten. |
| **OpenClaw Chat** | Umbenennung des bisherigen Chats: zeigt den **Gateway-gespiegelten** Verlauf (SSE), gebunden an die gewählte Gruppe. |
| **Cursor Summary** | **Neu:** Zeigt **keinen** zweiten Live-Chat, sondern **verdichtete** IDE-Historie / projektbezogene Spuren, die ins System zurückfließen (Markdown-Quelle: v. a. `Studio_Framework/050_Artifacts/A070_ide_cursor_summaries/` + ggf. OpenClaw Memory). *Implementierung folgt.* |

## Rollen / Labels (Abgleich mit Harness)

- **Triade (OpenClaw):** **TARS** (Thesis), **MARVIN** (Antithesis), **CASE** (Synthesis / Umsetzung). **SONIC** wird durch **CASE** ersetzt. In der **IDE** wird **TARS** normal genutzt; **Wechsel** zwischen Harness-Charakteren (TARS / MARVIN / CASE / …) ist möglich — **CASE** ist damit **nicht** „nur IDE-Spur“. Die früher **separat** geführte CASE-Parallel-Seele wird ins **OpenClaw-Workspace-Archiv** überführt (keine zweite aktive Harness-SOUL).  
- UI-Label im Channel Manager: **„TARS in IDE“** / **„IDE / CASE“** — **nicht** „CASE SKILLS“ als verwirrender Parallel-Begriff, sobald die UI angepasst ist.



## Explizit out of scope (MVP)

- Channel Manager als **einzige** Chat-Oberfläche, die **parallel** dieselbe Absicht an IDE **und** OpenClaw **sendet** (Doppelantworten).  
- Vollständiger Ersatz des OpenClaw-Web-Chats — wer dort arbeitet, bleibt dort; **OpenClaw Chat** im CM ist der **Spiegel**, nicht der Konkurrent, alle Inhalte werden 1 zu 1 vom OpenClaw-Web-Chats übertragen.

## Nächste technische Schritte (kurz)

1. Frontend: Tabs **OpenClaw Chat** | **Cursor Summary** (Summary zunächst Platzhalter oder MD-Liste aus konfigurierbarem Pfad).  
2. Skills: `memory`- / Summary-Pipeline für IDE → `A070_ide_cursor_summaries/` (Studio) + `memory/` (OpenClaw).  
3. Spec: `CHANNEL_MANAGER_SPECIFICATION.md` — Verweis auf dieses Dokument als **Scope-of-Record**.

---
*Status: Scope-of-Record für MVP-Entscheidung; UI-Implementierung kann inkrementell folgen.*
