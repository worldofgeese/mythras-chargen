# Customs skill merge

## Bug report

- Expected: Career and bonus allocations to `Customs` merge into the culture-specific standard skill row, e.g. `Customs (God Forgot)`.
- Actual: Play Mode showed both `Customs (God Forgot)` and plain `Customs`, splitting base and allocated points into duplicate rows.
- Reproduction: Create a Scholar with career/bonus points in Customs. In Play Mode, inspect the skills table.

## Root cause

- `SKILLS_DATA` stores the standard skill as `Customs()`, while career data and point allocation use plain `Customs`.
- `Helpers.getCompiledSkills()` added allocation keys literally, creating a second `Customs` map entry instead of adding to `Customs()` (`index.html:1792-1814`).
- `App.compileAllSkills()` read allocations by exact rendered key, so the `Customs()` row did not include plain `Customs` points and the custom-row pass added a duplicate `Customs` row (`index.html:5100-5106`, `index.html:7521-7523`, `index.html:7548-7553`).

## Investigation log

1. Reproduced during Arkat Play Mode QA: the skills table showed `Customs (God Forgot)` at base value and a separate `Customs` row with career/bonus points.
2. Added a regression asserting only one culture-specific Customs row with career and bonus allocations merged (`test-chargen.js:2041-2061`).
3. Canonicalized plain `Customs` allocation keys to `Customs()` in `Helpers.getCompiledSkills()`, merged plain Customs allocations into the `Customs()` row breakdown, and skipped the custom plain `Customs` row (`index.html:1792-1814`, `index.html:5100-5106`, `index.html:7521-7523`, `index.html:7552-7553`).

## Resolution status

Fixed. `node test-chargen.js` passes 294/294 after the change.
