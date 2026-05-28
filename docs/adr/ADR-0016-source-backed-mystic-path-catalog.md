---
title: "Source-Backed Mystic Path Catalog"
adr: ADR-0016
status: Accepted
date: 2026-05-28
prd: "N/A"
decision: "Mystic character creation uses a source-backed path/talent catalog from Mythras Core examples, not freeform path or talent entry"
---

# ADR-0016: Source-Backed Mystic Path Catalog

## Status

Accepted

## Date

2026-05-28

## Requirement Source

* **PRD**: N/A
* **Beads**: `mythras-chargen-wbwv`
* **Decision Point**: User explicitly rejected freeform Mystic path/talent entry and required Mystic characters to select from Mythras Core example paths/talents, analogous to Sorcerer spell lists and Shaman spirit lists.

## Context

The generator previously exposed Mystic chargen as freeform text fields for `mysticismPath` and `mysticismTalents`. That matched the broad Mythras rule permission for Games Master designed or agreed paths, but it produced poor UX and weak data custody:

* players could type unsupported or misspelled talents;
* UI controls were too small and clipped labels;
* validation could not distinguish source-backed choices from table-local inventions;
* saved/imported characters could carry freeform Mystic choices that were not traceable to reference data.

The user clarified that this app's first-character-creation flow must not be freeform. Mystic choices should behave like Sorcerer spells and Shaman spirits: pick from a verified list. Mythras Core provides example paths and talent lists in the Mysticism chapter, including Path of Abjuration, Path of Shadows, and the worked Path of the Jerboa example. The same rules also state that a starting Mystic chooses one path and begins with known talents equal to one twentieth of the relevant Mysticism skill.

## Decision Drivers

* Preserve the app's source-data custody model: `PDF -> references/*.json -> inline constant -> UI`.
* Keep player choices beginner-safe: lists over freeform typing.
* Make Mystic validation equivalent to other higher-magic systems.
* Support the Mythras starting talent formula using the actual Mysticism skill, not POW alone.
* Keep custom GM-designed paths possible at the table without pretending the app can attest them.

## Considered Options

### Option 1: Keep freeform Mystic path and talent text fields

Freeform entry lets players and GMs type any path or talent.

* Good, because Mythras allows GM-designed or agreed paths.
* Good, because it avoids curating a catalog.
* Bad, because the app cannot validate or attest typed choices.
* Bad, because players new to Mythras do not know what a valid path or talent looks like.
* Bad, because UI quality suffers from long labels inside small inputs.

### Option 2: Use only source-backed Core example paths and talents in the app

The app presents a fixed catalog of Mythras Core example paths and their listed talents. Custom paths remain outside the generator and require GM handling.

* Good, because every app choice can cite Mythras Core pages and reference JSON.
* Good, because it matches the Sorcerer/Shaman picker pattern.
* Good, because validation can reject freeform or mismatched path/talent imports.
* Good, because the UI can use full-width list controls instead of cramped text inputs.
* Bad, because it excludes legal Mythras custom paths from the app's first-character-creation UI.
* Bad, because the example catalog is smaller than all possible Mystic traditions.

### Option 3: Hybrid source-backed examples plus "GM custom" freeform option

The app would offer source-backed paths and a GM custom escape hatch.

* Good, because it supports both book examples and table creativity.
* Bad, because it reintroduces unattested data into saved characters.
* Bad, because player-facing validation and import/export semantics become ambiguous.
* Bad, because the user explicitly rejected freeform Mystic selection for this generator.

## Decision

Chosen option: **Option 2: Use only source-backed Core example paths and talents in the app**, because this keeps Mystic chargen consistent with the app's source-backed higher-magic architecture and with the user's explicit UX requirement.

Implementation consequences:

* Add a source-backed Mystic path catalog derived from `references/mythras-raw/mysticism.json`.
* Expose `MYSTICISM_PATHS` inline in `index.html` from that reference data.
* Render a path dropdown and talent checkbox list instead of freeform text inputs.
* Validate imports and agent calls against the selected path's talent list.
* Compute starting talent count from `getCharacterMysticismSkillValue(character) / 20`, with the app preserving the existing novice-friendly minimum of one known starting talent for active Mystic providers.
* Do not expose a GM-custom/freeform option in the player-facing flow.

## Consequences

### Positive

* Mystic choices are now source-backed and testable.
* New players see concrete path/talent examples instead of blank text fields.
* Freeform and mismatched Mystic imports can be rejected.
* The app can present full-width, aligned talent choices rather than clipped inputs.

### Negative

* A legal table-created Mystic path cannot be represented directly in first-character-creation UI.
* Additional source work is required before non-Core Mystic traditions can appear in the catalog.

Mitigation: custom paths remain a GM/table procedure outside the generator until they are promoted through the same source-backed reference pipeline.

### Neutral

* The catalog can expand later by adding verified reference JSON and inline constant updates.

## Validation

* `test-chargen.js` covers import validation, freeform rejection, and starting talent review rendering.
* `test-agent-api.mjs` covers agent/browser Mystic path selection.
* Browser QA screenshots cover the redesigned Mystic picker and alignment.

## Related

* **Plan**: N/A
* **ADRs**: Relates to `docs/adr/ADR-0013-source-backed-higher-magic-access.md`; relates to `docs/adr/ADR-0014-source-backed-disambiguation-and-passion-structure.md`.
* **Implementation**: `index.html`, `references/mythras-raw/mysticism.json`, `test-chargen.js`, `test-agent-api.mjs`.
