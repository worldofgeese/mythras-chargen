---
status: accepted
date: 2026-05-03
decision-makers: Kypris
---

# ADR-005: Resolve Descriptive Placeholder Skills to Concrete Specializations

## Context and Problem Statement

Mythras career professional skills include descriptive placeholders like `Craft (Primary)`, `Lore (Specific Species)`, `Healing (Specific Species)` that serve as prompts for the player to choose their own specialization. The current `isAnySkill()` regex only catches `(any|local|any other)` patterns — 12 career skills with descriptive placeholders bypass this check and leak as literal text into Play Mode and PDF export.

Affected careers: Crafter, Fisher, Beast Handler, Hunter, Physician, Sailor, Scholar.

Additionally, users can allocate points to an `(any)` skill without first selecting a specialization, causing generic names to survive into the final character sheet.

### Evidence

- **Mythras Core Rulebook p.28-40:** These descriptors are role-playing prompts. The book expects the player to read "Craft (Primary)" and write their own specialization.
- **Adventures in Glorantha p.28-29:** Provides contextual hints within placeholders: `"Lore (any, but Politics is common)"` — suggestions, not constraints.
- **skoll.xyz pregens (notesfrompavis.blog):** Most leave descriptive placeholders unresolved on templates. Only pre-resolve when character concept strongly implies one (e.g., "Horse Whisperer" → `Lore(Horses)`, "Stonemason" → `Craft(Masonry)`).
- **Mythras professional-skills.json:** States "Specialisation required" for Craft, Lore, Art, Language, Culture — no further guidance.

## Decision

Treat descriptive placeholders as **free-text prompts with contextual hints and category suggestions**:

1. **Detect** placeholders via new `isPlaceholderSkill()` function matching patterns like `(Primary)`, `(Secondary)`, `(Specific...)`, `(Hunting Related)`, etc.
2. **Unify** detection with `needsDisambiguation()` = `isAnySkill() || isPlaceholderSkill()`
3. **Show same datalist UI** as `(any)` skills — free-text input with category suggestions from `DISAMBIGUATION_LISTS`
4. **Display the descriptor** (e.g., "Primary Catch") as hint/guidance text
5. **Disable points input** until specialization is entered
6. **Validate** at step transitions — block progression if any skill key matches a placeholder pattern
7. **Random generation** resolves placeholders by picking from `DISAMBIGUATION_LISTS[category]`

### Non-goals

- Career-specific option lists (all sources confirm these are player-choice)
- AiG cultural hint propagation (e.g., "but Politics is common") — future enhancement
- Changing CAREERS_DATA structure

## Consequences

* Good, because no unresolved placeholder text can reach Play Mode or PDF export
* Good, because the fix reuses existing disambiguation UI patterns — minimal new code
* Good, because free-text entry is preserved (player can type any specialization)
* Good, because descriptor text serves as role-playing guidance per RAW intent
* Bad, because random generation picks from generic category lists rather than career-contextual ones (a Fisher's random "Lore" might be "Astronomy" — but this matches how skoll.xyz handles it)

## Implementation Plan

* **Affected paths**: `index.html` lines 943-944 (detection), 14589-14613 (cultural wizard), 15373-15397 (career wizard), 15881-15996 (random gen), 13618-13654 (validation)
* **Dependencies**: None — pure JS changes within the single-file app
* **Patterns to follow**: Existing `isAnySkill()` + `disambiguateSkill()` + datalist UI pattern at lines 14589-14613
* **Patterns to avoid**: Do not create career-specific option mappings; do not modify CAREERS_DATA; do not change behavior of already-concrete skills (e.g., `Craft (Alchemy)` in Alchemist)

### Tasks

1. Add `isPlaceholderSkill()` function after `isAnySkill()` (line 945)
2. Add `needsDisambiguation()` unifying function
3. Add `parsePlaceholderSkill()` to extract category and hint text
4. Update cultural skills wizard renderer (line 14589) to use `needsDisambiguation()`
5. Update career skills wizard renderer (line 15373) to use `needsDisambiguation()`
6. In both renderers: show hint text, disable points until selection made
7. Update `validateCurrentStep()` for steps 5 and 6 to reject unresolved skills
8. Update `generateRandomCharacter()` to resolve placeholders
9. Ensure already-concrete skills (e.g., `Craft (Alchemy)`) don't trigger false positives

### Verification

- [ ] Select career "Crafter" — `Craft (Primary)` shows datalist UI with hint "Primary"
- [ ] Select career "Fisher" — `Lore (Primary Catch)` shows datalist UI with hint "Primary Catch"
- [ ] Points input is disabled until specialization typed/selected
- [ ] Cannot advance wizard step with unresolved placeholder in skill store
- [ ] Cannot advance wizard step with `(any)` skill that has points but no selection
- [ ] Play Mode shows only concrete skill names (no placeholder text)
- [ ] PDF export contains only concrete skill names
- [ ] Random character with career "Beast Handler" has no `(Specific Species)` in data
- [ ] Already-concrete career skills like `Craft (Alchemy)` render normally (no datalist)
- [ ] All 19 existing fixtures still pass tests unchanged

## Alternatives Considered

* **Option A — Expanded regex only**: Extend `isAnySkill()` to catch `(Primary|Secondary|Specific.*)`. Rejected because it conflates detection with intent — `(any)` skills use the exact same datalist, while descriptive placeholders benefit from showing the hint text as guidance.
* **Option B — Career-specific option maps**: Pre-define what each placeholder should resolve to per career. Rejected because all three sources (Mythras Core, AiG, skoll.xyz) confirm these are player-choice prompts, not constrained lists. Would also be high-maintenance.

## More Information

- Related: ADR-004 (Language-to-Homeland Mapping) — established the disambiguation pattern this ADR extends
- Verification report: `.rpi/reviews/verify-disambiguation-e2e-2026-05-03.md`
- Design doc: `.rpi/designs/placeholder-skill-disambiguation.md`
- Spec: `.rpi/specs/placeholder-disambiguation.md`
- Revisit trigger: If AiG gets a full release with explicit career-to-specialization tables, consider career-specific suggestions

## Attestation

| Claim | Source |
|-------|--------|
| Career placeholders are player-choice prompts | Mythras Core p.28-40 (career tables) |
| "Specialisation required" is the only guidance | professional-skills.json (extracted from Mythras Core p.45-54) |
| AiG provides hints within placeholder text | AiG p.28-29: "Lore (any, but Politics is common)" |
| skoll.xyz leaves most placeholders unresolved | notesfrompavis.blog pregens (templates 4063, 5602, 6664, 5498, 9537) |
| Descriptors are contextual guidance | Mythras Core career table layout design |
