---
status: accepted
date: 2026-05-04
decision-makers: [worldofgeese]
---

# ADR-0002: Use RQG Characteristics Directly (No 75-Point Scaling)

## Context and Problem Statement

The deprecated pipeline scaled RQG characteristic values to a Mythras 75-point build using proportional redistribution. This changes who the character IS (a STR 16 character becomes STR 14). Pre-gens are specific named characters with defined abilities.

## Decision

Use the raw RQG characteristic values from the Pregen Folios PDF as-is. Do NOT apply Mythras 75-point scaling.

Rationale:
- Pre-gens with `charMethod: "pregen"` bypass the generator entirely
- The folio values define the character's identity — changing them changes the character
- Derived attributes (action points, damage modifier, HP per location) are calculated at load time from whatever values are stored
- The app's `Calc.calculateAllAttributes()` works with any valid characteristic values

## Consequences

- Fixture characteristics will sum to more than 75 (RQG uses different point-buy ranges)
- This is ONLY for pre-gens — randomly generated characters still use Mythras rules
- Action Points, Damage Modifier, etc. are still correctly derived from whatever stats are present

## Implementation Plan

- **Affected paths**: `fixtures/*.json`
- **Pattern**: `characteristics` object contains raw PDF values
- **Tests**: Verify derived attributes are correctly calculated from stored characteristics

## Verification

- [ ] No fixture has characteristics that differ from PDF source values
- [ ] `Calc.calculateAllAttributes()` produces correct derived values for each fixture's characteristics
