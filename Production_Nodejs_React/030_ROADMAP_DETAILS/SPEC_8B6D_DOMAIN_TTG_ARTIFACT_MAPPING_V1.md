# SPEC — §8b.6D Domain → Studio artifact & TTG mapping (V1)

**Status:** normative — **high priority** companion to §8b.6 corpus migration  
**Scope:** `Studio_Framework` migration batch tooling + optional CM review surfaces  
**Lesson:** `gendev-lesson-domain-ttg-mapper`  
**Legacy narrative source (human):** `General_Dev/ROUTER_IDENTITY_DOMAIN.md` (mirror: `…/normalized/mirror_General_Dev/ROUTER_IDENTITY_DOMAIN.md`)

## 1. Purpose

While importing General_Dev into Studio you must **know where each top-level source tree belongs** (`050_Artifacts/A…`) and **which Telegram Topic Groups (TTGs)** are plausible routing homes — **without** treating folder names as `confirmed` CM bindings.

`ROUTER_IDENTITY_DOMAIN.md` remains valuable as:

- **Operator index:** explains Domains vs General_* vs skills/router rules.
- **Seed list** of domain *names* and intent (see §4 *The Map* / *Active Domains*).

It is **not** sufficient alone: you need a **versioned mapping table** with confidence, reviewer, and explicit `deferred` rows.

## 2. Deliverables (V1)

| Artifact | Role |
| --- | --- |
| **Mapping file** | Single YAML (or JSON) under the active migration batch, e.g. `095_Migration_Staging/General_Dev/<batch-id>/mapping/domain_to_artifact_ttg.v1.yaml` |
| **Report** | Generated or hand-maintained `reports/domain-mapping-status.md`: coverage (every `Domain_*` / agreed `General_*` row present or `deferred`) |
| **Optional script** | `tools/validate-domain-mapping.mjs` — checks every top-level prefix in `mirror_General_Dev` has a row; emits report; **read-only** |

## 3. Mapping row schema (minimum)

Each logical source root (e.g. `Domain_Blender/`):

```yaml
rows:
  - source_prefix: "Domain_Blender/"           # trailing slash; matches manifest rel_path prefix
    studio_target: "050_Artifacts/…"           # concrete A-prefix path or TBD
    studio_target_status: proposed | accepted | deferred
    ttg_candidates: []                         # optional: { topic_group_id, label, confidence: low|med|high }
    evidence:
      - "ROUTER_IDENTITY_DOMAIN.md §4.B"
      - "manual_review_2026-04-28"
    reviewer: null                             # IRC / handle when accepted
    notes: ""
```

Rules:

- **`source_prefix`**: must align with `manifest.jsonl` `source.rel_path` prefixes (stable for scripting).
- **No `confirmed` TTG** from folder name alone — align with promote/bridge specs; candidates are **hypotheses** until reviewer + CM policy say otherwise.
- **`deferred`**: explicit decision “not now” with reason (better than missing row).

## 4. How to build the first table (process)

1. **Inventory top-level prefixes** from the batch `manifest.jsonl` (or mirror tree): all `Domain_*`, `General_*`, and other roots you import.
2. **Seed human intent** from `ROUTER_IDENTITY_DOMAIN.md` §4 (Active Domains / General_ folders).
3. **Propose `studio_target`** from existing slice maps (A010/A020/A050/…) where they already exist; else mark `proposed` + notes.
4. **Add TTG candidates** only from CM/operator evidence (classifier output, existing TTG registry) — never auto-promote.
5. **Review queue:** ambiguous rows (two plausible A-prefix homes, conflicting TTG hints) stay `proposed` until resolved.

## 5. Integration points

- **Import scripts:** `apply-general-*-target-map.mjs` patterns consume `migration.target_path` today; extend or add `apply-domain-bundle-target-map.mjs` that reads **this YAML** and applies only rows with `studio_target_status: accepted`.
- **CM / Workbench (later):** read-only API or CSV export of `rows[]` for artifact index “routing hints”.
- **Traceability:** each row links to lesson id `gendev-lesson-domain-ttg-mapper` and batch id.

## 6. Acceptance (V1)

- Every **`Domain_*`** top-level prefix in the frozen batch has **exactly one** mapping row OR an explicit **`studio_target_status: deferred`** with `notes`.
- `ROUTER_IDENTITY_DOMAIN.md` is **cited in `evidence`** where it informed the row (not blindly copied).
- No row sets TTG binding state to **confirmed** without a separate CM policy step.

## 7. Non-goals (V1)

- Replacing `ROUTER_IDENTITY_DOMAIN.md` as prose operator doc (it may be **ported or summarized** separately).
- Automatic Studio folder creation from mapper alone (creations stay in import PRs with human sign-off).
