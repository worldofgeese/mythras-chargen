---
date: 2026-05-19
author: worldofgeese
commit: 4df3293
branch: main
repository: mythras-chargen
topic: "Miracle Qualification"
tags: [test-cases, outline, MQL, miracle-qualification]
status: pending
feature: "Miracle Qualification"
module: MQL
portal: Wizard
slug: miracle-qualification
tc_count: 0
last_updated: 2026-05-19
last_updated_by: worldofgeese
---

## Routes
- `Wizard Step 9` — Cult Selection (miracle qualification logic within miracle picker)

## Endpoints
- N/A (client-side only)

## Scope Decisions
- In scope: `getQualifiedInitiateMiracles()`, rune affinity matching, locked miracle logic, `effectiveMax` capping
- In scope: Interaction between character's rune affinities and available miracles
- Out of scope: Miracle picker UI rendering (covered in miracle-picker)
- Out of scope: Initiation gate that precedes miracle selection (covered in initiation-gate-validation)

## Domain Context
- `App.getQualifiedInitiateMiracles(cultName)` filters the full miracle list to those the character qualifies for
- Qualification is based on rune affinity matching: each miracle has associated runes, character must have matching affinity
- "Locked" miracles: miracles whose rune requirements the character does NOT meet (shown greyed out)
- `effectiveMax = Math.min(maxMiracles, qualifiedMiracles.length)` — caps picks at available qualified count
- `maxMiracles` = POW/2 (devotional pool from ADR-007)
- If fewer miracles qualify than POW/2 allows, the cap is reduced (player can't pick what they don't qualify for)
- Pool-capped message shown: "Pool limited by qualified miracles" when effectiveMax < maxPicks
- Dual use: validation (in nextStep gate) AND rendering (in miracle picker UI)

## Test Data Requirements
- Character with rune affinities matching all cult miracles (full access)
- Character with rune affinities matching only some cult miracles (partial access, effectiveMax capped)
- Character with no matching rune affinities (zero qualified, should be rare but possible)
- Character with high POW (many slots) but few qualifying miracles (cap test)
- Character with low POW (few slots) but many qualifying miracles (normal operation)

## Key Behaviors

1. `getQualifiedInitiateMiracles()` returns filtered list based on rune affinity match
2. Each miracle's rune requirements checked against CharacterData.runeAffinities
3. Miracles with matching runes → qualified (selectable)
4. Miracles without matching runes → locked (greyed out, not clickable)
5. `effectiveMax` = min(POW/2 floor, qualifiedMiracles.length)
6. Selection counter shows: "Selected: N / effectiveMax"
7. Pool-capped indicator when effectiveMax < maxPicks (shows explanation)
8. Validation in nextStep: requires selectedMiracles === effectiveMax (must fill all available slots)
9. Rune affinity changes (if possible at this step) update qualification in real-time
10. Used in both validation (line ~2596) and rendering (line ~5130)

## Boundary Conditions

- 0 qualified miracles → effectiveMax = 0, no selection required, advance allowed
- 1 qualified miracle, POW/2 = 5 → effectiveMax = 1, must pick that 1
- All miracles qualified, POW/2 = 3 → effectiveMax = 3, pick any 3
- Exactly POW/2 miracles qualified → effectiveMax = POW/2 (no cap message)
- Miracle has multiple rune requirements (AND vs OR matching?)
- Rune affinity at 0% → does it still qualify? (threshold question)
- Cult with no defined miracles → effectiveMax = 0
- Hybrid cult miracles → qualification uses same rune matching
- Deselecting a miracle → counter decrements, slot freed
- Validation toast: "Please select your initiate miracles (N/M chosen)"

## Existing Coverage
- Unit tests validate miracle list structure
- E2E tests build characters with miracles but don't test edge-case qualification

## Test Types Needed

- Unit: `getQualifiedInitiateMiracles()` with various rune affinity sets
- Unit: effectiveMax calculation edge cases
- Unit: Rune matching logic (single rune, multiple runes, no match)
- Integration: Locked miracles display correctly (greyed, not clickable)
- Integration: Pool-capped message appears when relevant
- Integration: Selection counter updates correctly
- Integration: Validation blocks with correct toast when under-selected
- E2E: Character with limited affinities → sees reduced pool → fills it → advances
- Regression: Changing cult doesn't leave stale miracle qualifications

## Fixtures to Use
- `vargast-windborn-orlanth.json` (Orlanth, Air/Movement runes — test matching)
- `leika-earthmother-ernalda.json` (Ernalda, Earth/Fertility runes)
- `torath-sunspear-yelmalio.json` (Yelmalio, Fire/Sky runes)
- `indrodar-greydog-humakt.json` (Humakt, Death/Truth runes)
- `yara-moonweaver-jakaleel.json` (hybrid — test miracle qualification in hybrid context)

## Checkpoint History
### 2026-05-19
**Q: Is rune matching OR or AND for multi-rune miracles?**
A: Based on code analysis, miracles with multiple runes use OR matching — any one affinity match qualifies.
