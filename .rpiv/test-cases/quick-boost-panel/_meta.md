---
date: 2026-05-19
author: worldofgeese
commit: 4df3293
branch: main
repository: mythras-chargen
topic: "Quick Boost Panel"
tags: [test-cases, outline, QBP, quick-boost-panel]
status: pending
feature: "Quick Boost Panel"
module: QBP
portal: Wizard
slug: quick-boost-panel
tc_count: 0
last_updated: 2026-05-19
last_updated_by: worldofgeese
---

## Routes
- `Wizard Step 9` — Cult Selection (Quick Boost sub-panel within initiation gate section)

## Endpoints
- N/A (client-side only, no backend)

## Scope Decisions
- Full feature in scope: Quick Boost panel, autoBoostCultSkills(), manual +/- buttons, pool counter
- Out of scope: The cult selection logic itself (covered in cult-selection-flow)
- Out of scope: Miracle picker interaction after boost (covered in miracle-qualification)

## Domain Context
- Quick Boost panel appears when character has cult skills below 50% and the initiation gate would block progress
- `autoBoostCultSkills()` distributes bonus points evenly across sub-50% cult skills to bring them to exactly 50%
- Panel uses in-place DOM updates (no full re-render) to avoid scroll position loss and performance overhead
- Bonus pool is drawn from remaining bonus skill points (Step 11 allocation)
- Panel shows blue background with "Quick Boost — Raise Cult Skills to 50%" header
- Each skill row has +/- buttons for manual fine-tuning after auto-boost

## Test Data Requirements
- Character with cult skills below 50% (most early-wizard states)
- Character with some cult skills above 50% (partial qualification)
- Character with all cult skills at/above 50% (panel should show success message)
- Character with zero remaining bonus points (auto-boost should do nothing or show warning)

## Key Behaviors

1. Panel renders when any cult skill is below 50%
2. Panel shows success message when all cult skills >= 50%
3. Auto-boost button distributes points evenly to sub-50% skills
4. Auto-boost respects available bonus point budget
5. +/- buttons adjust individual skill values
6. Pool counter shows remaining boost budget
7. In-place DOM update (no full `renderCurrentStep()` call)
8. Scroll position preserved across boost interactions
9. Boosted values persist to CharacterData (not ephemeral)
10. After boost, initiation gate re-evaluates immediately

## Boundary Conditions

- Zero bonus points remaining → auto-boost disabled or warning shown
- Single cult skill below 50% → auto-boost puts all points there
- Many cult skills below 50% → even distribution across all
- Skill already at 49% → needs exactly 1 point to reach 50%
- Skill at 0% base → needs many points, may exhaust pool
- Auto-boost would exceed total bonus budget → partial allocation
- Clicking +/- rapidly → no double-allocation or negative values
- Panel after cult change → reflects new cult's skills
- Hybrid cult (Waha) → boost panel covers skills from both magic paths

## Existing Coverage
- None (feature added in commit d403201)

## Test Types Needed

- Unit: autoBoostCultSkills() point distribution logic
- Unit: Pool counter calculation (total available - already allocated)
- Integration: Panel renders when skills below 50%
- Integration: Panel hides/shows success when threshold met
- Integration: +/- buttons update skill values and persist
- Integration: In-place DOM update (no scroll jump)
- Integration: Auto-boost + manual adjustment combination
- E2E: Boost skills → initiation gate passes → advance to miracles
- Regression: Boost does not corrupt career/cultural skill allocations

## Fixtures to Use
- `vargast-windborn-orlanth.json` (theist, may have sub-50% cult skills early)
- `telmori-wolfbrother.json` (animist, useful for testing Telmor cult)
- Any fixture where cult skills start below 50% in wizard flow

## Checkpoint History
### 2026-05-19
**Q: What is the boost point source?**
A: From remaining bonus skill points (Step 11 budget), allocated early via Quick Boost.
