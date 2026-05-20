# Arkat sorcery Rune Affinity initiation gate

## Bug report

- Expected: Arkat can pass Step 9 using the house-rule sorcery mapping: Invocation is the spell's Rune Affinity and Shaping is the Law Rune affinity.
- Actual: Step 9 treated `Invocation` as `Invocation (Arkat)` and `Shaping` as a separate skill total, so Quick Boost could not make an otherwise valid Arkat sorcerer pass initiation.
- Reproduction: Build an Arkat character with Darkness/Law/Stasis runes and at least one sorcery spell. Step 9 reports too few cult skills at 50% even though the sorcery picker text says Invocation and Shaping are replaced by rune affinities.

## Root cause

- `resolveDefaultCultSkillKey()` mapped generic `Invocation` to `Invocation (<cult>)` without considering sorcery cult rules (`index.html:5114-5121`).
- `resolveCultSkillRequirement()` only special-cased generic `Runic Affinity`, then fell through to ordinary skill lookup/fallbacks for `Invocation` and `Shaping` (`index.html:5223-5239`).
- Rune Affinity allocations only supported a single generic `Runic Affinity` bucket, so the Quick Boost panel had no way to target the Law Rune specifically when Law was secondary (`index.html:5129-5160`).

## Investigation log

1. Reproduced during manual Arkat QA: Step 9 stayed blocked after choosing Arkat and sorcery spells because `Invocation (Arkat)` topped out below 50%.
2. Checked handouts and implementation guidance; both say sorcery maps Invocation to the spell Rune Affinity and Shaping to the Law Rune.
3. Added regression coverage for rune-specific Law boosts and Arkat Step 9 validation (`test-chargen.js:4988-5064`).
4. Implemented rune-specific allocation support, sorcery-specific cult-skill resolution, and suppression of rune-affinity allocation rows in the compiled skill table (`index.html:5123-5160`, `index.html:5162-5197`, `index.html:5223-5232`, `index.html:7480-7486`, `index.html:7528-7530`).

## Resolution status

Fixed. `node test-chargen.js` passes 291/291 after the change.
