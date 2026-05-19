---
date: 2026-05-19
author: worldofgeese
commit: 4df3293
branch: main
repository: mythras-chargen
topic: "Initiation Gate Validation"
tags: [test-cases, outline, IGV, initiation-gate-validation]
status: pending
feature: "Initiation Gate Validation"
module: IGV
portal: Wizard
slug: initiation-gate-validation
tc_count: 0
last_updated: 2026-05-19
last_updated_by: worldofgeese
---

## Routes
- `Wizard Step 9` — Cult Selection (validation gate before miracle selection)

## Endpoints
- N/A (client-side only)

## Scope Decisions
- In scope: The 5-skill-at-50% requirement, soft threshold for small cults, toast warnings, validation blocking
- In scope: Interaction with `App.nextStep()` validation flow
- Out of scope: The Quick Boost panel that helps pass the gate (covered in quick-boost-panel)
- Out of scope: Miracle picker after gate passes (covered in miracle-qualification)

## Domain Context
- Mythras initiation requires 5 cult skills at 50%+ (ADR-007 house rule: Hannu's interpretation)
- "Soft threshold" for small cults: if a cult has fewer than 5 designated skills, the requirement scales down
- Gate fires on `App.nextStep()` from Step 9 — if not met, shows toast and blocks advancement
- Console warning logged: `Cult requirement: ${cultName} requires ${requiredCount} skills at 50%+`
- Validation is checked at line ~2574: `// Initiation gate: 5 cult skills at 50%+ required`
- Toast message: "Initiation requires N cult skills at 50%+ — you have M"

## Test Data Requirements
- Character with 0 cult skills at 50% (fully failing)
- Character with exactly 5 cult skills at 50% (barely passing)
- Character with 4 cult skills at 50% (off-by-one failure)
- Character with all cult skills at 50%+ (clearly passing)
- Small cult with fewer than 5 skills (soft threshold kicks in)

## Key Behaviors

1. Validation checks count of cult skills >= 50% total value
2. Default requirement: 5 cult skills at 50%+
3. Soft threshold: scales down for cults with < 5 designated skills
4. Toast error shown when gate fails (includes counts)
5. Console warning logged with cult name and counts
6. Step advancement blocked (stays on Step 9)
7. Gate re-evaluates after Quick Boost or manual changes
8. Gate passes → allows advancement to miracle/spirit/sorcery selection
9. Works for all cult types (theist, animist, sorcery, hybrid)
10. "Qualifying skills" count uses total skill value (base + cultural + career + bonus)

## Boundary Conditions

- Exactly 5 skills at exactly 50% → passes (boundary)
- 5 skills at 49% → fails (off-by-one)
- 4 skills at 100% → fails (count, not total)
- Small cult with 3 skills, all at 50% → passes (soft threshold)
- Cult with 10+ skills, only 5 at 50% → passes (only 5 needed)
- Hybrid cult → which skills count as "cult skills"?
- Skill at 50% from cultural allocation alone (no career points) → still counts
- Skill boosted to 50% via Quick Boost → gate re-evaluates immediately
- No cult selected → gate check skipped or different error
- Cult with no explicit skill list → fallback behavior

## Existing Coverage
- None directly (related to commit d403201, a5a49bc)

## Test Types Needed

- Unit: Cult skill qualification counting logic
- Unit: Soft threshold calculation for small cults
- Unit: Edge cases (0 skills, 4 skills, 5 skills, 6 skills)
- Integration: Toast displays correct counts on failure
- Integration: Step advancement blocked on failure
- Integration: Step advancement allowed on success
- Integration: Re-evaluation after skill boost
- E2E: Fail gate → boost → pass gate → advance
- Regression: Gate doesn't block non-cult steps

## Fixtures to Use
- `vargast-windborn-orlanth.json` (Orlanth, many cult skills)
- `telmori-wolfbrother.json` (Telmor, potentially smaller skill list)
- `norana-hearthkeeper-hearth-mother.json` (Hearth Mother, may have few cult skills)
- Any fixture representing early-wizard state before allocations

## Checkpoint History
### 2026-05-19
**Q: How does soft threshold work for small cults?**
A: If cult has fewer than 5 designated skills, requiredCount = min(5, cult_skills.length). Gate uses the smaller number.
