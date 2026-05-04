---
status: accepted
date: 2026-05-04
decision-makers: [worldofgeese]
---

# ADR-0001: Source Precedence for Pre-gen Fixtures

## Context and Problem Statement

We are building a deterministic pipeline to convert all 10 RQG Starter Set pre-generated characters into Mythras-compatible fixture JSON files. Multiple source documents exist with overlapping but sometimes conflicting data. We need a clear hierarchy to resolve conflicts and ensure data fidelity.

The old pipeline (`scripts/generate_starter_set_pregens.py`) and old-format fixtures (aranda, dazarim, harmast, nathem, sorala, vishi, vostor, yanioth) are deprecated. Only `vasana.json` and `ionara.json` represent the current target format.

## Decision

Apply sources in this strict order when determining fixture values:

| Priority | Source | Use For |
|----------|--------|---------|
| 1 (highest) | RQG Starter Set Pregen Folios PDF | All character data: characteristics, skills, weapons, magic, companions, passions, rune affinities |
| 2 | Adventures in Glorantha (AiG) | Combat style traits, folk magic spell availability, culture-specific data |
| 3 | Mythras Core | Derived attribute formulas (action points, damage modifier, hit points per location, encumbrance) |
| 4 | Notes from Pavis / CULTS_DATA | Miracle validation (spells must exist in app's cult database) |
| 5 (lowest) | House rules | Documented deviations from above sources (custom combat style names, skill point allocation distribution) |

### Conflict Resolution Rules

- If the PDF says a characteristic is X, use X. Do NOT scale to Mythras 75-point build.
- If a miracle from the PDF doesn't exist in CULTS_DATA, it's a CULTS_DATA gap (fix the data), not a fixture error.
- If a weapon from the PDF doesn't match AiG's combat style definition, create a custom combat style (Priority 5 house rule), documented per-character.
- House rule overrides MUST be recorded in the attestation ledger with justification.

## Consequences

### Positive
- Single source of truth eliminates ambiguity during conversion
- Future pre-gen additions follow the same hierarchy
- Attestation is straightforward: every field traces to a priority level

### Negative
- Manual PDF transcription is required (no automated extraction from graphical PDF)
- Some values require judgment calls (skill point allocation within 100-point budgets)
- CULTS_DATA gaps may block miracle validation for some characters

### Non-goals
- This ADR does NOT govern randomly-generated characters (those use AiG as primary)
- This ADR does NOT require adding missing cults (e.g., Seven Mothers) to CULTS_DATA
- This ADR does NOT apply to Mythras Core pre-gens (Mago, Makarios, Narres, Varakos)

## Implementation Plan

- **Affected paths**: `fixtures/*.json`, `scripts/convert-pregens.mjs`, `test-fixtures.mjs`
- **Pattern**: Each fixture includes `"charMethod": "pregen"` which signals to the app that generator validation is bypassed
- **Verification**: The conversion script logs source precedence level for each resolved conflict
- **Tests**: `test-fixtures.mjs` validates all fixtures load without errors and skill totals = 100

## Verification

- [ ] All 10 fixture files contain `"charMethod": "pregen"`
- [ ] Characteristics in fixtures match PDF values exactly (no scaling applied)
- [ ] Miracles validate against CULTS_DATA for all cults except Seven Mothers
- [ ] Custom combat style names are documented in `pregen-pipeline-v2.md` design doc
- [ ] No unresolved placeholder skills exist in any fixture

## More Information

- Design doc: `.rpi/designs/pregen-pipeline-v2.md`
- Spec: `.rpi/specs/pregen-pipeline.md`
- Primary source PDF: `~/Downloads/RuneQuest Roleplaying in Glorantha/Starter Set/RQG Starter Set - Pregen Folios.pdf`
