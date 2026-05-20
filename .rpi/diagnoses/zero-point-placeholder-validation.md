# Zero-point placeholder validation

## Bug report

- Expected: Step 5 only requires a specialization for placeholder skills that actually receive cultural skill points.
- Actual: Step 5 blocked advancement with "Please select a specialization for Craft (any)" even when `Craft (any)` had 0 points and the cultural budget was valid.
- Reproduction: In God Forgot Step 5, spend 100 points on concrete cultural skills, leave Craft/Lore specializations unselected at 0, pick three runes and three folk spells, then click Next.

## Root cause

- Step 5 validation scanned all `CharacterData.culturalSkills` keys for placeholders without checking whether the value was greater than 0 (`index.html:2715-2721`).
- Step 10 had the same pattern for `CharacterData.careerSkills`, so a zero-point career placeholder could produce the same false block later (`index.html:2800-2807`).
- The structured validation API omitted placeholder checks, so agent-facing validation did not match the toast-based wizard validation (`index.html:4026-4046`).

## Investigation log

1. Reproduced during Arkat manual QA after a valid 100/100 Step 5 distribution.
2. Added a regression that Step 5 ignores zero-point `Craft (any)`/`Lore (any)` entries but still blocks an allocated `Craft (any)` entry (`test-chargen.js:4842-4884`).
3. Updated Step 5 and Step 10 validations to require specialization only when unresolved placeholder entries have allocated points, and mirrored that in `getValidationState()` (`index.html:2715-2717`, `index.html:2800-2803`, `index.html:4026-4046`).

## Resolution status

Fixed. `node test-chargen.js` passes 293/293 after the change.
