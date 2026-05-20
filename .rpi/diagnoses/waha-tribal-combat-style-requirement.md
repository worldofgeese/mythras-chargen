# Waha tribal combat-style requirement

## Bug report

- Expected: Waha's `Combat Style (Tribal)` initiation requirement should use the selected Praxian tribal combat style, such as `Combat Style (Bison)`.
- Actual: Step 9 resolved `Combat Style (Tribal)` as a nonexistent skill key, so the displayed requirement stayed detached from the selected culture style.
- Reproduction: Create a Praxian character with Bison combat style, select Waha on Step 9, and inspect the cult requirement list.

## Root cause

- `resolveCombatStyleRequirement()` only understood prose requirements like `Combat style with sword`.
- Placeholder requirements of the form `Combat Style (<qualifier>)` fell through to ordinary skill lookup, where `Combat Style (Tribal)` has no concrete allocation row (`index.html:5241-5265`).

## Investigation log

1. Reproduced during Waha hybrid manual QA: the cult requirement panel showed `Combat Style (Tribal): 24%` instead of naming the selected Bison style.
2. Added a regression proving `Combat Style (Tribal)` resolves to `Combat Style (Bison)` and includes career/bonus allocations (`test-chargen.js:5078-5090`).
3. Updated the combat-style resolver to handle both prose weapon requirements and placeholder `Combat Style (...)` requirements by using the selected combat style when no weapon-specific match is requested (`index.html:5241-5265`).

## Resolution status

Fixed. `node test-chargen.js` passes 296/296 after the change.
