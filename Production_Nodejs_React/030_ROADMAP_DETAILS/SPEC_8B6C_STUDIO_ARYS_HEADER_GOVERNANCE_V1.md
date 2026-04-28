# SPEC — §8b.6C Studio ARYS header governance (V1)

**Status:** active implementation slice (high priority)  
**Scope:** `Studio_Framework` tooling + alignment with CM roadmap §8b.6 / artifact onboarding  
**Companion lesson:** `gendev-lesson-header-normalization` (batch `095_Migration_Staging/General_Dev/<batch-id>/lessons/`)  
**Prior art (do not copy blindly):** `General_Dev/Master_Rules/040_Framework_TOOLS/arys_header_normalize_v12.py`, `arys_manager.py`, `structural_validator.py`

## 1. Purpose

Scale **safe** ARYS header checks beyond one-off migration scripts: **mechanical** validation and reports vs **semantic** review (type meaning, TTG bindings), without mutating frozen General_Dev in place.

## 2. What exists today (V1 slice)

| Deliverable | Location |
| --- | --- |
| Read-only corpus scan | `Studio_Framework/tools/arys_header_governance/scan-markdown-headers.mjs` |
| Default report | `Studio_Framework/100_Framework_Reports_Dokus/arys_header_scan_latest.md` |

The scanner walks configured roots (default: `050_Artifacts/`), flags missing front matter, missing required keys (`id`, `title`, `type`, `status`), invalid `id`, and **duplicate `id`** across the scanned tree.

## 3. Planned (not yet implemented)

- **Dry-run / apply split** for optional auto-fixes (only mechanical fields; never TTG auto-confirm).
- **Per-type required key matrix** (see `050_Artifacts/README_ARTIFACT_INGESTION_AND_ONBOARDING.md` §2).
- **Manifest or sidecar** `header: fixed` vs `header: review` (lesson acceptance criteria).
- **Channel Manager** consumption of scan JSON/report for artifact index / review UI (optional).

## 4. Operator usage

From `Studio_Framework` repo root:

```bash
node tools/arys_header_governance/scan-markdown-headers.mjs
node tools/arys_header_governance/scan-markdown-headers.mjs --root 050_Artifacts --root 095_Migration_Staging/General_Dev/2026-04-27-1fe240e/normalized/mirror_General_Dev
```

Optional: `STUDIO_FRAMEWORK_ROOT`, `--report` (path relative to repo root or absolute).

## 5. Safety

- Default scan is **read-only**.
- Do not point scans at unchecked quarantine exports without a scoped exclusion policy.
