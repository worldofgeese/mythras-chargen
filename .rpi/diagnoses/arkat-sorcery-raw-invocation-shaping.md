# Arkat sorcery RAW Invocation/Shaping correction

## Bug report

- Expected: Sorcery uses RAW Mythras Core Invocation to cast and Shaping to alter range, duration, targets, magnitude, or similar spell parameters. Hannu clarified: "Have not mapped the sorcery to runes. Using invocation shaping only."
- Actual: The app and player handouts described sorcery as the spell's Rune Affinity for casting and Law Rune for Shaping. Arkat initiation also resolved `Invocation` and `Shaping` against rune affinities instead of sorcery skills.
- Reproduction: Choose Arkat, inspect Step 9/Play Mode/PDF sorcery text, or resolve Arkat cult skills in tests. The UI/PDF/handouts mention Rune Affinity/Law Rune, and the cult gate does not require RAW Invocation/Shaping.

## Root cause

- `resolveCultSkillRequirement()` special-cased sorcery cults so `Invocation` mapped to generic Rune Affinity and `Shaping` mapped to Law Rune (`index.html:5374-5387` before the fix).
- `resolveDefaultCultSkillKey()` also mapped generic `Invocation` to `Invocation (<cult>)`, which hid the fact that sorcery specializations need to inherit the RAW `Invocation` skill definition (`index.html:5153-5156` before the fix).
- Step 9, Play Mode, PDF export, and handouts all repeated the invalid rune-mapping assumption (`index.html:4887`, `index.html:8014`, `index.html:8529`, `docs/handouts/magic-path.html:62`, `docs/handouts/rules-and-house-rules.html:92` after the fix).

## Investigation log

1. Confirmed the one-pagers tag some spells as sorcery but do not attach a rune map to sorcery spells.
2. Reproduced the mismatch with red tests covering player handouts, Step 9 sorcery text, Play Mode text, PDF text, and Arkat cult-skill resolution.
3. Removed the sorcery Rune Affinity/Law Rune special case and restored RAW skill resolution. Specialized `Invocation (Arkat)` now inherits the `Invocation` base skill through `Calc.resolveSkillDef()` (`index.html:1844-1846`).
4. Deferred sorcery cult-skill gate enforcement until Step 11 because RAW Invocation/Shaping allocations happen in Step 10/11, while Step 9 still validates spell selection (`index.html:5439-5459`, `index.html:5680`, `index.html:2799-2803`).
5. Updated player handouts to explain Invocation/Shaping and explicitly say no sorcery spell-rune map exists for this campaign (`docs/handouts/index.html:72`, `docs/handouts/magic-path.html:62`, `docs/handouts/rules-and-house-rules.html:92`, `docs/handouts/source-trail.html:72`).
6. Added regression coverage for RAW sorcery labels, PDF text, handout forbidden claims, specialized Invocation base inheritance, and Step 11 final cult-gate enforcement (`test-chargen.js:5818`, `test-chargen.js:5844`).

## Resolution status

Fixed. `node test-chargen.js` passes 356/356 and `node test-agent-api.mjs` passes 33/33 after the change.
