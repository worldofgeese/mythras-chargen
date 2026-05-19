---
date: 2026-05-19
author: worldofgeese
commit: 4df3293
branch: main
repository: mythras-chargen
topic: "Data Normalization"
tags: [test-cases, outline, DNM, data-normalization]
status: pending
feature: "Data Normalization"
module: DNM
portal: Wizard
slug: data-normalization
tc_count: 0
last_updated: 2026-05-19
last_updated_by: worldofgeese
---

## Routes
- `Wizard Steps 5, 8, 10` — Cultural Skills, Career Selection, Career Skills (disambiguation triggers)

## Endpoints
- N/A (client-side only)

## Scope Decisions
- In scope: `disambiguateSkill()`, `_disambiguationMap`, skill name cleanup, Craft collision fix
- In scope: Placeholder skill resolution (ADR-004 + ADR-005)
- In scope: `isAnySkill()` detection, free-text disambiguation UI
- Out of scope: Skill point allocation mechanics (covered in cultural/career/bonus-skill-allocation)
- Out of scope: Professional skill checkbox selection (covered in character-creation-wizard)

## Domain Context
- Many Mythras skills have placeholder names: "Craft (any)", "Art (any)", "Language (any)", "Lore (any)"
- `disambiguateSkill(skillName, cultureName, random)` resolves placeholders to specific names
- `_disambiguationMap` tracks which placeholder resolved to which specific name (per-character)
- The Craft collision bug (commit fdacdf5): deselecting "Craft (Secondary)" was removing "Craft (Primary)" too
- Fix: each disambiguated skill tracked independently via its original placeholder key
- `isAnySkill()` unified check for skills needing disambiguation (ADR-004 + ADR-005)
- Free-text input shown for "(any)" skills to let player type their specialization
- `App.disambiguateAndUpdateFreeText('cultural', skillName, value)` handles free-text entry
- Skills flow through: placeholder → disambiguation → specific name → allocation → Play Mode → PDF

## Test Data Requirements
- Career with multiple "Craft (any)" skills (e.g., Crafter: Craft (Primary), Craft (Secondary))
- Culture with "Language (any)" skills
- Skills with parenthetical qualifiers that are NOT placeholders (e.g., "Command (Specific Species)")

## Key Behaviors

1. `isAnySkill()` detects placeholder skills ("(any)", "(Primary)", "(Secondary)")
2. `disambiguateSkill()` provides culture-appropriate options or free-text
3. Free-text input shown for "(any)" skills
4. Disambiguation result stored in `_disambiguationMap`
5. Each placeholder tracks independently (no collision between Craft Primary/Secondary)
6. Deselecting one disambiguated skill does NOT remove another with same base name
7. Resolved names carry through to Play Mode and PDF export
8. Disambiguation persists across wizard navigation and page reload
9. Skills that look similar but aren't placeholders preserved as-is
10. Comma-within-parentheses preserved correctly ("Command (Specific Species, Monster or Spirit)")

## Boundary Conditions

- Two "Craft" skills with different qualifiers selected simultaneously → independent tracking
- Deselect Craft (Secondary) → Craft (Primary) remains with its resolved name
- Deselect Craft (Primary) → Craft (Secondary) remains with its resolved name
- Free-text entry with special characters (apostrophes, accents)
- Empty free-text submission → validation error or default
- Same specific name chosen for two different placeholders → conflict handling
- Career change → disambiguation map cleared for career skills
- Culture change → disambiguation map cleared for cultural skills
- Skill with "(any)" in a context that's NOT a placeholder (false positive prevention)
- Very long specialization name → layout handling
- Re-entering disambiguation after going back in wizard → preserves previous choice

## Existing Coverage
- `test-chargen.js` has tests for skill disambiguation
- Commit fdacdf5 specifically fixed Craft collision (regression risk)

## Test Types Needed

- Unit: `isAnySkill()` with various skill name patterns
- Unit: `disambiguateSkill()` returns correct options per culture
- Unit: `_disambiguationMap` independence (Primary vs Secondary)
- Unit: Comma-within-parentheses preservation
- Integration: Free-text input appears for placeholder skills
- Integration: Resolved name appears in allocation grid
- Integration: Deselect one Craft → other remains (collision fix)
- Integration: Resolved names in Play Mode skills table
- Integration: Resolved names in PDF export
- E2E: Select career with multiple Craft → disambiguate both → deselect one → verify other persists
- Regression: Craft collision fix (fdacdf5) — deselecting one does not remove sibling

## Fixtures to Use
- Any fixture with disambiguated skills (Craft, Art, Language)
- `sartarite-warrior.json` (likely has Language disambiguation)
- `harmast.json` (may have Craft disambiguation)
- Synthetic test cases for collision scenarios

## Checkpoint History
### 2026-05-19
**Q: What was the Craft collision bug?**
A: Deselecting "Craft (Secondary)" checkbox in Step 8 was also removing "Craft (Primary)" from selectedProfessionalSkills because both matched the base name "Craft". Fix: track via original placeholder key, not resolved name.
