---
date: 2026-05-19
author: worldofgeese
commit: 4df3293
branch: main
repository: mythras-chargen
topic: "Hobby Skill Dropdown"
tags: [test-cases, outline, HSD, hobby-skill-dropdown]
status: pending
feature: "Hobby Skill Dropdown"
module: HSD
portal: Wizard
slug: hobby-skill-dropdown
tc_count: 0
last_updated: 2026-05-19
last_updated_by: worldofgeese
---

## Routes
- `Wizard Step 11` — Bonus Skill Allocation (hobby skill select within bonus points section)

## Endpoints
- N/A (client-side only)

## Scope Decisions
- In scope: Hobby skill select element, `addBonusSkillByName()`, skill addition to character sheet
- In scope: Dropdown population (available professional skills not already on sheet)
- Out of scope: Bonus point allocation mechanics (covered in bonus-skill-allocation)
- Out of scope: Skill disambiguation (covered in data-normalization)

## Domain Context
- Hobby skills are professional skills not in the character's cultural or career skill lists
- A `<select>` dropdown (`#hobby-skill-select-container`) allows adding new professional skills
- `App.addBonusSkillByName(name)` adds the skill to the character's available skill list
- Added hobby skills then appear in the bonus allocation grid for point spending
- CharacterData.hobbySkillName persists the selected hobby skill across saves
- Skill is checked: "is this a hobby skill?" — not in cultural, career, or standard skill lists
- Dropdown shows chevron indicator (commit f08bff7) for discoverability

## Test Data Requirements
- Character with career that leaves many professional skills unselected
- Character that already has most professional skills from culture + career
- Skill names with special characters or parenthetical qualifiers

## Key Behaviors

1. Select dropdown renders in bonus allocation step
2. Dropdown contains professional skills NOT already on character sheet
3. Selecting a skill calls `addBonusSkillByName(name)`
4. Added skill appears in allocation grid immediately
5. Added skill can receive bonus points
6. Hobby skill name persists to CharacterData.hobbySkillName
7. Persists across page reload (localStorage)
8. Dropdown resets after selection (ready for another add)
9. Cannot add same skill twice (duplicate prevention)
10. Chevron indicator visible on dropdown

## Boundary Conditions

- All professional skills already on sheet → dropdown empty or hidden
- Skill with parenthetical qualifier (e.g., "Art (any)") → handled correctly
- Adding then removing hobby skill → skill disappears from grid
- Hobby skill persists if character reloads page
- Hobby skill survives backward/forward navigation in wizard
- Very long skill name → dropdown doesn't overflow
- Skills that need disambiguation (e.g., "Craft (any)") → triggers disambiguation flow
- Multiple hobby skills → only one hobbySkillName stored? Or array?
- Career change after hobby skill added → hobby skill remains or is cleared?

## Existing Coverage
- None directly (hobbySkillName field exists in test fixtures but not tested)

## Test Types Needed

- Unit: `addBonusSkillByName()` adds to correct data structure
- Unit: Duplicate prevention logic
- Unit: Skill filtering (only professional skills not on sheet)
- Integration: Dropdown populates correctly after career selection
- Integration: Added skill appears in allocation grid
- Integration: Persistence across wizard navigation
- Integration: Persistence across page reload
- E2E: Add hobby skill → allocate points → visible in Play Mode
- Regression: Hobby skill doesn't interfere with career/cultural skill allocations

## Fixtures to Use
- `harmast.json` (test hobby skill presence in data)
- `vasana.json` (standard character, check what's available)
- Any fixture with `hobbySkillName` field populated

## Checkpoint History
### 2026-05-19
**Q: Can multiple hobby skills be added?**
A: Based on code, `hobbySkillName` is singular (one field). Multiple adds may replace rather than accumulate.
