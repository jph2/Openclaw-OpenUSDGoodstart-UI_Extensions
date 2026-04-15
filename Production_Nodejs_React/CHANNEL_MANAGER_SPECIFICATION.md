---
arys_schema_version: "1.3"
id: "c87a53f1-285b-4c12-8e3d-d4a97f2b2c9d"
title: "Spezifikation & Kernanforderungen: Centralized Channel Management"
type: TECHNICAL
status: active
trust_level: 3
agent_index:
  context: "Gateway-first Channel Manager: configuration plane, OpenClaw transcript mirror, session-bound routing, Zod-hardening, Studio A070 bridge."
  maturation: 3
  routing:
    hub: "#3-zielbild-der-architektur-gateway-first-konfigurationsspiegel--studio-bridges"
    logic: "#5-datenfluss--design-entscheidungen"
    risks: "#6-architektur-risiken--audit-härtung"
created: "2026-04-12T01:07:00Z"
last_modified: "2026-04-15T22:00:00Z"
author: "AntiGravity"
provenance:
  git_repo: "OpenClaw_Control_Center"
  git_branch: "main"
  git_path: "Production_Nodejs_React/CHANNEL_MANAGER_SPECIFICATION.md"
tags: [specification, channel_manager, gateway-first, requirements, zod-hardening]
---

# Spezifikation & Kernanforderungen: Sovereign Channel Management (V2.0)

**Version**: 2.0.0 | **Date**: 15.04.2026 | **Status**: Sovereign | **Context**: Gateway-First, CM als Konfigurationsspiegel, Triade (TARS · MARVIN · CASE)
20260415_2200_SPECIFICATION_v2.0

**Status:** active | **Master Source:** Horizon Studio Framework

---

## 1. Einleitung & Vision: Das Private Ökosystem

Die Architektur bleibt ein **geschlossenes, privates Ökosystem** mit maximaler Kontinuität zwischen Telegram, OpenClaw-Gateway und lokaler Arbeit.

*   **Gateway-First:** **OpenClaw (Harness)** — Web-UI, Sessions, `openclaw.json`, Workspace-`memory/` — ist die **Quelle der Wahrheit** für Telegram-Agentenverkehr. Der Channel Manager **spiegelt** Konfiguration und Transkripte; er ersetzt **nicht** den Gateway-Chat als alleinige Oberfläche (keine parallele Absicht → keine Doppelreaktionen). Siehe [CHANNEL_MANAGER_SCOPE_MVP_2026-04-15.md](CHANNEL_MANAGER_SCOPE_MVP_2026-04-15.md).
*   **Triade (Harness):** **TARS** · **MARVIN** · **CASE** (ersetzt SONIC). Gleiche Rollen in **IDE** und **Telegram/Web**; **Persona ist wechselbar** — **CASE** ist **nicht** „nur IDE-Spur“. Veraltete Parallel-**CASE**-SOUL → Workspace-Archiv (keine zweite aktive Harness-Identität).
*   **Studio Framework:** Strukturierter Rückfluss (u. a. **A070_ide_cursor_summaries**) ist **Studio**-Seite; **Bridges** verbinden Harness ↔ Projekt-Repos (`080` im Horizon-Modell).
*   **Wissen ohne Grenzen:** Sessions teilen sich den Workspace; **MEMORY.md** / Memory-Dateien bleiben die langfristige Spur — **getrennt** vom **Transcript**, das das UI filtert und anzeigt.
*   **Mirroring vs. Bridging:** Telegram liefert **Bridge**-Kontext; der Channel Manager **spiegelt** Gateway-Zustand (SSE aus Session-/Transkript-Pfaden), statt Telegram-`getUpdates` als Primärquelle zu nutzen.

### 1.1 MVP Scope (15.04.2026) — Channel Manager Rolle

Der Channel Manager bleibt **Konfigurations-Hub** und **OpenClaw-Chat-Spiegel**; er wird **nicht** als alleinige Chat-Oberfläche genutzt, die dieselbe Absicht parallel an IDE und Gateway sendet (Vermeidung von Doppelreaktionen). Geplante Tabs: **Configuration** | **OpenClaw Chat** | **Cursor Summary**. **Verbindliche Kurzfassung:** [CHANNEL_MANAGER_SCOPE_MVP_2026-04-15.md](CHANNEL_MANAGER_SCOPE_MVP_2026-04-15.md).

---

## 2. Kommunikations-Protokoll (Asymmetric Relay + Gateway-First)

**Ziel:** Keine HTTP-409-Kollisionen durch konkurrierendes **`getUpdates`**; **Lesepfad** läuft über **Gateway / Session** statt Bot-Polling als „Source of Truth“.

*   **Asymmetric Relay (Bots):** Wo weiterhin getrennte Bot-Identitäten vorkommen, bleibt der **technische** Split (z. B. Listener vs. Relay) — **ohne** dass das UI dieselbe Absicht parallel an IDE **und** Gateway **und** Telegram sendet (MVP: **ein** klarer Sendepfad über **`openclaw agent`** mit `--deliver`).
*   **Inbound (UI):** Transkripte aus dem **Workspace-/Session-Modell** des Gateways (File-Change / SSE), **nicht** primär Live-Polling aller Telegram-Kanäle durch das Node-Backend.
*   **Outbound (UI):** **`openclaw agent --channel telegram --to … --message … --deliver`** — CLI-Default **`--deliver`** ist `false`; Zustellung muss explizit gesetzt werden.
*   **Routing:** Nachrichten sind **kanal- und session gebunden** (`conversation_label`, Chat-ID, Session-Key); kein Fan-out aller Gateway-Events auf alle UI-Kanäle.

---

## 3. Zielbild der Architektur (Gateway-First, Konfigurationsspiegel & Studio-Bridges)

**Kein „Private Hub-and-Spoke“ mehr im Sinne von:** UI + IDE als gleichwertige **zweite** Sendezentrale direkt in Telegram **parallel** zum Gateway. **Zielbild 2026:** **Harness (Gateway)** zentral für Agenten; **Channel Manager** = **Konfiguration** + **Spiegel** + optional **Cursor Summary**; **Projekte / IDE** hängen an **Bridges** und MCP, nicht als zweiter Telegram-Hub.

### 3.1 Rollen im Bild

| Schicht | Rolle |
|--------|--------|
| **OpenClaw Harness** | Gateway, Sessions, Web-Chat, `openclaw.json`, Workspace-`memory/` — **governing layer**. |
| **Channel Manager** | **Laufzeit:** `openclaw.json` / Kanäle lesen-schreiben, SSE, Chat-Spiegel **OpenClaw Chat**, Tab **Cursor Summary** (Verdichtung, nicht zweiter Live-Chat). |
| **Telegram** | Private Gruppen / Topics — **Anbindung** über Gateway; **kein** alleiniges `getUpdates`-Backend als SoT. |
| **Projects \| IDE** | Cursor / Repos; **MCP** zum Channel Manager; **kein** paralleles „alles nochmal an Telegram senden“ im MVP. |
| **Studio Framework** | Artefakte, u. a. **`A070_ide_cursor_summaries`** — Rückfluss der IDE-Verdichtung in die Studio-Struktur (Horizon `050` / `080`). |

### 3.2 Diagramm

```mermaid
graph TB
    subgraph Harness["OpenClaw Harness"]
        GW[Gateway Web + Sessions]
        WS[Workspace / memory]
    end

    subgraph TG["Telegram"]
        TGG[Private Groups / Topics]
    end

    subgraph CM["Channel Manager"]
        CFG[Tab: Configuration]
        CHAT[Tab: OpenClaw Chat Spiegel]
        SUM[Tab: Cursor Summary]
    end

    subgraph IDE["Projects | IDE"]
        CUR[Cursor / Repos]
    end

    subgraph Studio["Studio Framework optional"]
        A070[A070 IDE Summaries]
    end

    GW <--> TGG
    GW --> WS
    CFG <-->|config| GW
    GW -->|SSE transcript mirror| CHAT
    CFG -->|openclaw agent send| GW
    SUM -.->|Markdown path| A070
    CUR -.->|MCP stdio| CFG
```

### 3.3 MVP-Tab-Modell (Scope-of-Record)

| Tab | Funktion |
|-----|----------|
| **Configuration** | Kanäle, Modelle, Skills, Agenten — **verbindliche** Laufzeitquelle. |
| **OpenClaw Chat** | **Spiegel** des gateway-gestützten Verlaufs (SSE), gebunden an gewählte Gruppe / Session. Chat kann paralel über diese Interface geführt werden, (derzeit keine Bilder...) |
| **Cursor Summary** | **Kein** zweiter Live-Chat; **verdichtete** IDE-/Projektspur — Quelle u. a. `Studio_Framework/050_Artifacts/A070_ide_cursor_summaries/`. |

**Verbindlich:** [CHANNEL_MANAGER_SCOPE_MVP_2026-04-15.md](CHANNEL_MANAGER_SCOPE_MVP_2026-04-15.md).

---

## 4. Kernanforderungen (Requirements)

### R1: Deterministische Konfiguration
Eine im Channel Manager gesetzte Konfiguration ist die **verbindliche Laufzeitquelle** für Kanäle / Skills / (MCP-Policies (Domain-Ownership auf `openclaw.json` o. Ä.)). Änderungen werden via **SSE** und Cache-Invalidierung an die UI propagiert; **Gateway** bleibt SoT für **laufenden** Telegram-Agentenverkehr.

### R2: Wissens-Kontinuität & History (System Transparency)
**Memory** (`MEMORY.md` / `workspace/memory/*.md`) bleibt die **langfristige** Spur; **Chat-UI** zeigt **Transkripte** (Gateway-Session), getrennt davon. **Gateway-First:** Das UI kann Heartbeats, Metadaten und System-Nachrichten sehen — **Message-Filter Layer** (Toggle) **muss** Chat vs. interne/systemische Zeilen trennen können.

### R3: Zod Integrity Protocol
Alle Konfigurations-Änderungen müssen vor dem Schreiben durch eine **Normalisierungs-Schicht** und ein gehärtetes Zod-Schema validiert werden.

### R4: Technische Verzeichnisstruktur

Repo-Root → `Production_Nodejs_React/` → `backend/` und `frontend/`. Mermaid ohne Klammern/`&` (bessere Renderer-Kompatibilität).

```mermaid
graph LR
    subgraph root
        R0[Repo root]
        PR[Production_Nodejs_React]
    end

    subgraph be
        BE[backend]
        IX[index.js]
        RT[routes]
        SV[services]
    end

    subgraph fe
        FE[frontend]
        SRC[src]
        CMP[components]
        APP[App.jsx]
    end

    R0 --> PR
    PR --> BE
    PR --> FE
    BE --> IX
    IX --> RT
    IX --> SV
    FE --> SRC
    SRC --> CMP
    SRC --> APP
```

### R5: MCP Governance & Whitelisting 
Eine granulare Steuerungs- und Berechtigungsebene (Whitelisting), über welche festgelegt wird, auf welche der lokal im Target-Environment (IDE: **Cursor**, ggf. AntiGravity) installierten MCP-Server die **Harness-Persona** (z. B. **CASE** bei Telegram-Antworten über MCP) im Kontext eines bestimmten Channels Zugriff hat.
- **Konzept:** Anstelle der aktiven Prozess-Administration (Start/Stop) aus dem Channel Manager heraus, operiert der Manager ausschließlich auf der **Policy-Ebene**. Er listet die erkannten Server aus der Konfiguration der Host-Umgebung (`mcp_config.json`) auf.
- **Visualisierung:** Die Verwaltung der MCP Permissions findet via farblich abgehobenem "+ Add MCP" Dropdown (z.B. gelbes Accent-Color) kanalbezogen statt. Die aktivierten MCPs werden im Channel-Modell mit Tags wie "INHERITED BY IDE" versehen.
- **Data Flow:** Die Whitelists ("Welche Server dürfen im Channel angesteuert werden?") fließen als dedizierte Ressource (z. B. `allowedMCPs` über `config://{telegram_id}`) zur Laufzeit als limitierendes Instruktionsset in den System-Prompt des ausführenden Agenten ein.

---

## 5. Datenfluss & Design Entscheidungen

### 5.1 Architekturüberblick
Siehe **§3 Zielbild** (Gateway-First, Konfigurationsspiegel, Tabs, Studio-Bridges). **Datenfluss:** Konfiguration CM ↔ Dateisystem; Transkripte Gateway → Workspace → SSE → UI; **Senden** UI → `openclaw agent` → Gateway/Telegram.

### 5.2 Key Design Decisions

| Aspekt | Entscheidung | Begründung |
|--------|----------|-----------|
| **Source of Truth (Telegram-Agent)** | OpenClaw Gateway / Sessions | Vermeidet 409-Polling-Konflikte; Transkripte aus Workspace-Pfaden. |
| **Channel Manager Rolle** | Konfiguration + Spiegel + Summary-Tab | Kein paralleler „All-Chat“-Hub; MVP Scope [CHANNEL_MANAGER_SCOPE_MVP_2026-04-15.md](CHANNEL_MANAGER_SCOPE_MVP_2026-04-15.md). |
| **State Management** | Zustand + React Query | Trennung von UI-Zustand und Server-Cache. |
| **Validation** | Zod (Hardened) | Laufzeit-Schutz gegen unvollständige JSONs. |
| **Communication** | SSE (Server-Sent Events) | Hot-Reload für Konfiguration und Transkript-Stream ohne Telegram-Polling. |
| **Persistence** | Domain-Driven Ownership | Vermeidung von File-Locks durch exklusive Zuständigkeiten. |

### 5.3 Rosetta Stone: Session Mapping Logic
To ensure **Context Continuity** between the Channel Manager, Anti-Gravity IDE, and the Telegram surface, the system MUST enforce **Session Key Parity**:

1. **Mapping Pattern**: `agent:main:telegram:group:<ID>`
2. **Physical Storage**: Matches the `Session ID` metadata in `/workspace/memory/*.md`.
3. **Deep Links**: Direct navigation to `http://<HOST>:18789/chat?session=<KEY>`.
4. **Context Trap Awareness**: Das System muss zwischen dem **Transcript-Zustand** (was im UI sichtbar ist) und dem **Prompt-Zustand** (was der Agent aktuell im Bearbeitungs-Buffer hat) unterscheiden. [[RESEARCH.md]](file:///media/claw-agentbox/data/9999_LocalRepo/OpenClaw_Control_Center/Production_Nodejs_React/CHANNEL_MANAGER_TelegramSync_RESEARCH.md)

Any channel configuration change in `openclaw.json` must preserve these keys to prevent "Context Amnesia".

### 5.4 MCP: IDE ↔ Channel Manager (Cursor / Host)

Die **IDE** (primär **Cursor**, optional **AntiGravity**) verbindet sich mit dem **Channel-Manager-MCP** (`Backend_MCP/`, stdio), **ohne** Bot-Tokens in der IDE-Config leaken zu müssen.

1. **MCP Resources (Context Hydration):** Ressourcen wie `memory://{telegram_id}` und `config://{telegram_id}` spiegeln Transkripte und kanalbezogene Policies/Skills — Kontext für **Harness-Personas** (z. B. **CASE** bei Telegram-Antworten über MCP) im jeweiligen Channel.
2. **MCP Tools (Governance Actions):** z. B. `send_telegram_reply(channel_id, message)` — Backend führt den **sicheren** Versand aus (zentral verwaltete Tokens / `openclaw agent` je nach Implementierung).
3. **Persona / Modus:** Wechsel zwischen **TARS**, **MARVIN**, **CASE** ist **Harness-Logik**; **SONIC** ist durch **CASE** ersetzt. Tools (falls vorhanden) müssen **nicht** eine veraltete „nur CASE“-IDE-Fiktion verfestigen — **Triade** gilt für IDE und Gateway.

**ACP:** Für **dezentrale** Agent-Agent-Kommunikation später relevant; **MCP** ist die gewählte **IDE↔lokale Engine**-Bridge.

Der Channel Manager bleibt **Policy- und Konfigurationsebene** + **MCP-Server**; **kein** Ersatz für das **OpenClaw Gateway** als Telegram-SoT.

---

### 5.5 Technischer Datenfluss (Sequence)
```mermaid
sequenceDiagram
    participant User as User
    participant React as React Component
    participant RQ as React Query
    participant API as Express API
    participant JS as Business Logic
    participant FS as File System (openclaw.json)

    User->>React: Interaction
    React->>RQ: Mutate Config
    RQ->>API: POST /api/channels/config
    API->>JS: Validate via Zod (Normalizer)
    JS->>FS: Atomic Write (Domain Ownership)
    FS-->>JS: Success
    JS-->>API: Response
    API-->>RQ: JSON Response
    RQ-->>React: Invalidate Cache
    React-->>User: UI Update
```

---

## 6. Architektur-Risiken & Audit-Härtung

1.  **D-01: Zod-Mine (Internal Crash):** Zod 4 stürzt bei `undefined` ab. **Vorgabe:** Programmatische Initialisierung aller Array-Felder.
2.  **D-02: Persistence Gaps:** Ohne atomaren Write-Handover im Backend droht Datenverlust. **Vorgabe:** Einsatz von validiertem Flush zur `openclaw.json`.
3.  **D-03: Bot Polling Conflict (The 409 Deadlock):** HTTP 409 Kollisionen (`terminated by other getUpdates request`).
    *   **Finding (14.04.2026):** Wenn Cloud-TARS und lokales Web-Backend (oder IDE AgentClaw) physisch dasselbe Bot-Token nutzen, entzieht Telegram der schwächeren Instanz die Leserechte. Die lokale UI bleibt schwarz ("Waiting for messages").
    *   **Decision (Gateway-First Architecture):** Wir verwerfen den Ansatz, Telegram als primäre Datenquelle (Source of Truth) über die Bot-API abzufragen. OpenClaw bzw. das Gateway/Web-Interface ist die eigentliche "Source of Truth". Unser lokales Backend deaktiviert jegliches `.getUpdates()`-Polling zu Telegram und lauscht stattdessen passiv auf die Gateway-Session-Files (Transcripts im Filesystem) und überträgt diese per SSE ans UI.

### 6.1 Outbound vom Channel Manager (OpenClaw CLI, Stand 15.04.2026)

Senden aus dem Channel Manager erfolgt über **`openclaw agent`** (Gateway), nicht über die Telegram Bot API im Node-Backend. Die offizielle CLI setzt **`--deliver` standardmäßig auf `false`** — ohne **`--deliver`** kann ein erfolgreicher Exit ohne sichtbare Zustellung der Antwort nach Telegram erfolgen.

**Parameter:** `--channel telegram --to "<chat_id>" --message "..." --deliver` (siehe [OpenClaw CLI agent](https://docs.openclaw.ai/cli/agent)). Zusätzlich: Message-Buffer im Backend initialisiert den Kanal-Key vor lokalem SSE-Update.

### 6.2 MCP & IDE-Host (Cursor vs. Remote-SSH)

Der Channel-Manager-MCP (`Backend_MCP/MCP-ChannelManager.mjs`) nutzt **stdio**. **Zwei Konfigurationen** sind üblich:

| Kontext | MCP-Konfiguration |
|---------|-------------------|
| **Cursor auf Windows** (lokaler Workspace) | `C:\Users\<User>\.cursor\mcp.json` — OpenClaw oft via `ssh <host> … run-mcp.sh` zum Linux-Backend |
| **Cursor Remote-SSH** (Laptop) | `~/.cursor/mcp.json` auf dem Laptop — direkt `node` + absoluter Pfad zu `MCP-ChannelManager.mjs` (kein `E:\`, kein Windows-`python.exe`) |

Eine **Projekt**-`.cursor/mcp.json` mit derselben **Server-ID** wie die User-Datei erzeugt **doppelte** MCP-Einträge — pro Server-ID nur eine Quelle.

### 6.3 Native Chat: Bilder & Medien (Upcoming — aktuell nicht implementiert)

**Status:** Backlog / Roadmap. **Nicht** Teil des aktuellen Stands (V2.0).

| Thema | Ist-Zustand | Ziel (später) |
|--------|-------------|----------------|
| **Outbound** | `POST /api/telegram/send` akzeptiert nur **Text**; Outbound via `openclaw agent --message "…"`. | Erweiterung um Medienpfad: z. B. `multipart/form-data` oder Base64-Body, Backend speichert temporär, dann Telegram **`sendPhoto`** / OpenClaw-CLI mit Medienparameter — je nach offizieller OpenClaw-API. |
| **UI** | `TelegramChat.jsx`: mehrzeiliges Textfeld; Bild-Paste wird erkannt und mit Hinweis abgewiesen (kein Upload). | Paste/Drop von Bildern, optionale Vorschau, Fortschritt, Fehlerbehandlung. |
| **Inbound** | Gateway-Transkripte im UI sind textzentriert. | Anzeige eingegangener Bilder aus Sessions, falls Gateway sie im Transcript abbildet. |

**Abgrenzung:** Bis zur Umsetzung bleiben **Fotos und Screenshots** der primäre Kanal **Telegram nativ**; der Channel Manager bleibt textorientiert.

---
*Status: V2.0 — Zielbild §3 auf Gateway-First + Konfigurationsspiegel + Triade + MVP-Tabs überarbeitet; doppelte §5.2 entfernt; §1/§2/§4/R5/§5.4 angepasst.*
