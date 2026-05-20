# Quick Boost reallocation cap diagnosis

## Bug report

Expected: Step 9 Quick Boost may reallocate cultural/career points toward cult requirements, but it must not leave any cultural or career skill with more than the normal 15 points assigned in that step.

Actual: In the manual Orlanth flow, clicking Auto-boost moved cultural points onto `Ride` even though it already had 15 cultural points, producing `Ride: 16`.

Reproduction: Build a Sartarite Orlanth candidate with `Ride: 15` cultural points and several cult skills just below initiation requirements, then click Step 9 Auto-boost.

## Root cause

- `index.html:5479` Phase 3 reclaimed cultural/career points based only on the gap to 50%.
- The target assignment at `index.html:5511` and `index.html:5537` added all reclaimed points without checking remaining per-step capacity on the target skill.

## Investigation log

1. Browser QA showed `Ride` becoming 16 after Auto-boost, while the rest of the wizard still describes a 15-point per-skill cap.
2. Added regression coverage in `test-chargen.js:4828` using the same Orlanth shape; it failed before the fix.
3. Capped cultural and career Phase 3 transfers by each target skill's remaining 15-point capacity at `index.html:5499` and `index.html:5527`.
4. Re-ran the test suite; the regression and existing tests passed.

## Resolution status

Fixed. Quick Boost Phase 3 now respects 15-point cultural/career caps while still reallocating whatever each target can legally receive.
