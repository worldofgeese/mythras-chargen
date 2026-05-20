# Runic Affinity display diagnosis

## Bug report

Expected: Bonus points assigned to `Runic Affinity` should display with the selected rune affinity they improve, and the skill table should not show a misleading standalone `Runic Affinity` row.

Actual: Orlanth Quick Boost qualified the character using Storm 42% + 8 bonus, but Play Mode showed Storm as 42% and a separate `Runic Affinity` skill row at 8%.

Reproduction: Complete an Orlanth character with Quick Boost assigning points to `Runic Affinity`, then inspect Play Mode or PDF output.

## Root cause

- `index.html:7621` and `index.html:8219` rendered raw rune affinity attributes without applying generic `Runic Affinity` bonus points.
- `index.html:7382` compiled `Runic Affinity` bonus points like a normal skill row, even though rune affinities are displayed in their own section.

## Investigation log

1. Browser QA showed Storm at 42% in Play Mode while Step 9 had qualified Storm as 50%.
2. Added regression coverage in `test-chargen.js:4938` and `test-chargen.js:4952`; both failed before implementation.
3. Added `App.getRuneAffinityDisplayValues()` at `index.html:5102`, reused it in Play magic/rune display and PDF export, and suppressed the generic `Runic Affinity` row from `compileAllSkills`.
4. Re-ran the test suite; the new regressions and existing tests passed.

## Resolution status

Fixed. Rune affinity bonuses now display with the selected rune affinity, including PDF export, and no longer appear as a standalone skill-table row.
