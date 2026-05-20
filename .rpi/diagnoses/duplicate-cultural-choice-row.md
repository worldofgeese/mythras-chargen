# Duplicate cultural choice row

## Bug report

- Expected: When a cultural choice resolves to a skill already present elsewhere in the culture skill list, the UI should show one row for that skill.
- Actual: Praxian Step 5 showed two `Navigate` inputs after selecting `Navigate` for the `Navigate or Swim` choice, making the visible allocation state confusing.
- Reproduction: Select Praxian, choose `Navigate` in the Step 5 choice dropdown, and inspect the cultural skill rows.

## Root cause

- Step 5 rendered `standardSkills` and `professionalSkills` directly in sequence.
- The choice row recorded the selected concrete skill but the later concrete professional skill was still rendered independently, so the same `CharacterData.culturalSkills.Navigate` key had two controls (`index.html:3890-3910` before fix).

## Investigation log

1. Reproduced during Waha/Praxian manual QA: the budget remained 15 points short while one visible `Navigate` row showed 15, because a second `Navigate` row still showed 0.
2. Added a render-plan regression for Praxian showing that selected `Navigate` collapses to one row while selected `Swim` still leaves the separate professional `Navigate` row available (`test-chargen.js:4864-4890`).
3. Added `App.getCulturalSkillRenderPlan()` to track concrete skills introduced by choice rows and skip later duplicate concrete rows, then routed Step 5 rendering through that plan (`index.html:3810-3841`, `index.html:3890-3910`).

## Resolution status

Fixed. `node test-chargen.js` passes 295/295 after the change.
