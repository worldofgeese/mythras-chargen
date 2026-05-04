# Final Verification Report: Pre-gen Conversion Pipeline

**Date:** 2026-05-04
**Overall Status:** PASS — all blockers resolved

## Skills Invoked (in order)

1. `/rpi-research` — investigated source PDF, codebase, test infra, deprecated pipeline
2. `/rpi-propose` — design doc + spec written
3. ADR tooling — 3 ADRs created (source precedence, characteristics, combat styles)
4. Implementation — 10 fixture files in current format, E2E test file
5. `/rpi-verify` — all 8 spec scenarios verified
6. `playwright-cli` (`@playwright/cli`) — browser-level testing of fixture loading, companion rendering, HP tracking, PDF export
7. Model council review — 3 BLOCKs found and fixed

## Tools Installed or Verified

| Tool | Status | Path |
|------|--------|------|
| `@playwright/cli` | Installed (0.1.11) | `npx playwright-cli` |
| Chromium | Verified | `/gnu/store/hspvnjz8gfcimznajp5pl4k8gj0vqf7k-profile/bin/chromium` (v147) |
| Node.js | Existing | system |
| Playwright (library) | Existing (1.59.1) | devDependency |

## Source Documents Read

- RQG Starter Set Pregen Folios PDF (all 20 pages, 10 characters)
- `.rpi/designs/companion-mounts.md`
- `.rpi/specs/companion-mounts.md`
- `index.html` (CULTS_DATA, CharacterData model, fromJSON/toJSON, renderPlayCompanions, PDF export)
- `test-100-chars.mjs` (existing test patterns)
- `scripts/generate_starter_set_pregens.py` (deprecated pipeline — skill mapping reference)
- Upstream cult PDFs (`references/cults-upstream/Storm/Orlanth.pdf`)

## ADRs Created

| ADR | Title | Status |
|-----|-------|--------|
| 0001 | Source Precedence for Pre-gen Fixtures | accepted |
| 0002 | Use RQG Characteristics Directly | accepted |
| 0003 | Custom Combat Styles for Pre-gen Characters | accepted |

## Implementation Changes Made

### New Files
- `fixtures/yanioth.json` — rebuilt from scratch
- `fixtures/harmast.json` — rebuilt from scratch
- `fixtures/vishi.json` — rebuilt from scratch (2 companions)
- `fixtures/vostor.json` — rebuilt from scratch
- `fixtures/sorala.json` — rebuilt from scratch
- `fixtures/nathem.json` — rebuilt from scratch (shadowcat companion)
- `fixtures/aranda.json` — rebuilt from scratch
- `fixtures/dazarim.json` — rebuilt from scratch (sable antelope companion)
- `test-fixtures.mjs` — E2E fixture validation test (10 fixtures)
- `docs/decisions/0001-source-precedence-pregen-fixtures.md`
- `docs/decisions/0002-rqg-characteristics-used-directly.md`
- `docs/decisions/0003-custom-combat-styles-for-pregens.md`
- `docs/decisions/README.md`
- `.rpi/designs/pregen-pipeline-v2.md`
- `.rpi/designs/pregen-combat-styles.md`
- `.rpi/designs/ocr-miracle-cleanup.md`
- `.rpi/specs/pregen-pipeline.md`
- `.rpi/reviews/pregen-pipeline-verify.md`

### Modified Files
- `index.html` — OCR cleanup of 24 miracle names in Orlanth/Vinga subcult entries
- `fixtures/vasana.json` — combat style renamed "Colymar Bison Cavalry", skill totals fixed
- `fixtures/ionara.json` — combat style renamed "Grazelander Noble", skill totals fixed

### Deleted Files
- `fixtures/balazaring-hunter.json` (deprecated template)
- `fixtures/praxian-beast-rider.json` (deprecated template)
- `fixtures/sartarite-warrior.json` (deprecated template)
- `fixtures/telmori-wolfbrother.json` (deprecated template)

## Tests Run

| Test | Result |
|------|--------|
| `test-100-chars.mjs` (random gen) | 100/100 PASS |
| `test-fixtures.mjs` (fixture loading) | 10/10 PASS |

## `playwright-cli` Commands Used

```bash
npx playwright-cli open http://localhost:8765/index.html
npx playwright-cli eval "typeof App"
npx playwright-cli eval "(function() { ... load fixture via fromJSON ... })()"
npx playwright-cli click e5  # Play Mode button
npx playwright-cli snapshot  # Verify Molon companion renders
npx playwright-cli eval "(function() { ... modify companion HP ... })()"
npx playwright-cli eval "(function() { ... verify round-trip ... })()"
npx playwright-cli eval "(async function() { await App.exportSinglePagePDF() ... })()"
npx playwright-cli eval "(function() { App.generateRandomCharacter(); ... check placeholders ... })()"
npx playwright-cli close
```

## Defects Found and Fixed

| # | Source | Defect | Fix |
|---|--------|--------|-----|
| 1 | OCR cleanup | 24 Orlanth/Vinga miracle names had OCR garbage | Cleaned to "Subcult: Name" format |
| 2 | Vasana fixture | bonusSkills summed to 45, not 100 | Added 55 points |
| 3 | Ionara fixture | careerSkills=125, bonusSkills=55 | Rebalanced to 100 each |
| 4 | Vasana/Ionara | Combat style "Sartarite Noble" doesn't match weapons | Custom names created |
| 5 | Yanioth fixture | "Summon Earth Elemental" not in CULTS_DATA | Changed to "Summon Gnome" |
| 6 | Aranda fixture | "Berserker" not in CULTS_DATA | Changed to "Berserk" |
| 7 | Nathem fixture | damageModifier "+1d4" wrong (STR+SIZ=28) | Fixed to "+1d2" |
| 8 | Vishi fixture | Cousin Monkey DM "+1d4" wrong (STR+SIZ=27) | Fixed to "+1d2" |

## Model Council Results

- **Accuracy Reviewer**: 3 BLOCKs (all fixed above)
- **Coverage Reviewer**: not run (model unavailable, coverage verified via /rpi-verify)
- **Quality/Fidelity Reviewer**: not run (model unavailable, fidelity verified via playwright-cli)

## Fidelity Matrix

| Field | Wizard | Play Mode | JSON Save/Load | PDF Export |
|-------|--------|-----------|----------------|------------|
| Character name | n/a (pregen) | ✓ displayed | ✓ survives round-trip | ✓ in header |
| Characteristics | n/a | ✓ displayed | ✓ | ✓ |
| Combat styles | n/a | ✓ custom names | ✓ | ✓ |
| Companions | n/a | ✓ renders stat block | ✓ deep-cloned | ✓ section renders |
| Companion HP | n/a | ✓ editable inputs | ✓ changes persist | ✓ |
| Skill allocations | n/a | ✓ compiled into totals | ✓ | ✓ |
| Miracles | n/a | ✓ | ✓ | ✓ |
| Passions | n/a | ✓ | ✓ | ✓ |

## Remaining Risks

1. **Mythras Core pre-gens still in old format** — `mago.json`, `makarios.json`, `narres.json`, `varakos.json` remain in deprecated schema. Not covered by this pipeline.
2. **Sorala sorcery in notes only** — No `sorcery` field in CharacterData model. If sorcery support is added later, her spells need migration.
3. **Nathem's Rurik shadowcat STR 36/SIZ 34** — Seems high for a cat, but matches the RQG PDF source exactly. Per ADR-0001, the PDF is authoritative.
4. **Seven Mothers not in CULTS_DATA** — Vostor's miracles cannot be validated. Out of scope per spec.
