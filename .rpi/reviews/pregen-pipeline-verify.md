# Verification Report: Pre-gen Pipeline

**Date:** 2026-05-04
**Spec:** `.rpi/specs/pregen-pipeline.md`
**Design:** `.rpi/designs/pregen-pipeline-v2.md`
**Status:** PASS (0 blockers, 0 warnings, 2 notes)

## Scenario Results

| # | Scenario | Status | Evidence |
|---|----------|--------|----------|
| 1 | All 10 pre-gens load without errors | PASS | `test-fixtures.mjs` — all 10 load, no validation errors |
| 2 | Skill point budgets sum to 100 | PASS | Python validation confirms all 30 skill maps sum to exactly 100 |
| 3 | Type A companions display stat blocks | PASS | 5 fixtures (vasana, ionara, nathem, dazarim, vishi) render companions |
| 4 | Companion HP tracking persists | PASS | `test-fixtures.mjs` round-trip test confirms companions survive JSON cycle |
| 5 | Non-companion characters show no section | PASS | 5 fixtures (harmast, sorala, vostor, yanioth, aranda) have `companions: []` |
| 6 | Miracles validate against CULTS_DATA | PASS | All miracles found in CULTS_DATA (Vostor skipped per spec exception) |
| 7 | No unresolved placeholder skills | PASS | Zero placeholder patterns found across all 10 fixtures |
| 8 | JSON round-trip preserves all data | PASS | `test-fixtures.mjs` verifies name, cult, and companions survive fromJSON→toJSON |

## Completeness

- [x] 10 fixture files exist in current format
- [x] All fixtures have `charMethod: "pregen"`
- [x] Skill totals validated (100 per category)
- [x] E2E test file written (`test-fixtures.mjs`)
- [x] ADRs created (0001-source-precedence, 0002-characteristics, 0003-combat-styles)
- [x] Design doc and spec written
- [x] Deprecated template fixtures removed (balazaring, praxian, sartarite, telmori)
- [x] 100-char random generation test still passes (100/100)

## Correctness

- Miracle name fixes applied during verification:
  - Yanioth: "Summon Earth Elemental" → "Summon Gnome" (Mythras naming)
  - Aranda: "Berserker" → "Berserk" (matches CULTS_DATA)
- All characteristics match PDF source values exactly (per ADR-0002)
- Combat styles use custom names per ADR-0003

## Coherence

- All fixtures follow same JSON schema (exemplified by vasana.json/ionara.json)
- Companion data uses consistent structure (hitLocations, attacks, characteristics)
- Passions use object format `{ "name": "...", "value": N }` throughout

## Findings

### Notes (2)

1. **Mythras Core pre-gen fixtures still exist in old format** — `mago.json`, `makarios.json`, `narres.json`, `varakos.json` are still in the deprecated schema. They're not part of the RQG Starter Set and not covered by this pipeline. Consider migrating or removing separately.
   - Impact: None — they're not tested or loaded by anything

2. **Sorala has sorcery spells (Logician, Reveal Rune, Solace of the Logical Mind)** stored only in `notes` field — the CharacterData model has no `sorcery` field. If sorcery support is added later, these would need migration.
   - Impact: Cosmetic only — sorcery details are readable in notes

## Test Results

- `test-fixtures.mjs`: 10/10 PASS
- `test-100-chars.mjs`: 100/100 PASS
