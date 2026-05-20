# Step 9 cult skill resolution diagnosis

## Bug report

Expected: Step 9 initiation and Quick Boost should count concrete character skills for generic cult requirements, including case variants such as `Native tongue` -> `Native Tongue`, specialized skills such as `Devotion` -> `Devotion (Orlanth)`, selected rune affinity values, and prose combat-style requirements such as `Combat style with sword` -> the character's sword-bearing combat style.

Actual: Orlanth showed 0/5 cult skills in the browser warning even when the character had qualifying Native Tongue, rune affinity, Devotion, and combat-style values. Quick Boost listed several requirements as 0% because each Step 9 caller used its own direct string match.

Reproduction: In the manual browser pass, select Orlanth on Step 9 with a Sartarite character. The warning reports underqualified cult skills and blocks advancement even though the character has matching concrete/specialized skills.

## Root cause

- `index.html:2753` used local exact/prefix string matching inside `validateCurrentStep`, so case differences and non-skill-derived rune/combat-style requirements were lost.
- `index.html:5215` and `index.html:5409` previously duplicated related matching logic for the warning panel and auto-boost flow, which let validation, display, and boost allocation drift.

## Investigation log

1. Reproduced in browser at Step 9 with Orlanth selected. The warning listed `Native tongue`, `Runic Affinity`, `Combat style with sword`, and `Devotion` as 0% or missing despite concrete character values.
2. Added regression coverage in `test-chargen.js:4852` for an Orlanth character whose five qualifying requirements rely on case-insensitive matching, selected rune affinity, specialized Devotion, and a sword-bearing combat style. The test failed before the fix.
3. Implemented shared cult requirement resolution in `index.html:5148` and routed validation, warning display, Quick Boost row rendering, direct boost adjustment, and auto-boost allocation through it.
4. Browser inspection exposed an over-broad specialization match: `Language (Stormspeech)` could display and boost as `Language (Heortling)`. Added coverage in `test-chargen.js:4859` and restricted prefix matching so only unqualified generic cult skills match arbitrary specializations.
5. Re-ran the test suite; the new regressions and existing tests passed.

## Resolution status

Fixed. The shared resolver now maps generic cult data to concrete character skills before Step 9 validation, warning display, and Quick Boost allocation.
