---
title: "Source-Backed Skill Disambiguation and Passion Structure"
adr: ADR-0014
status: Accepted
date: 2026-05-24
prd: "N/A"
decision: "Use source-backed disambiguation rules, CSE-backed combat styles, structured Passions, and explicit normalization for non-specialization parentheticals"
---

# ADR-0014: Source-Backed Skill Disambiguation and Passion Structure

## Status

Accepted

## Date

2026-05-24

## Requirement Source

- **PRD**: N/A
- **Bead**: `mythras-chargen-t1lx`
- **Decision Point**: Broaden ADR-005 placeholder handling into a complete policy for all specialization-bearing skills, structured Passions, random/manual disambiguation, CSE combat style authority, and final/export blocking.

## Context

ADR-005 established that descriptive placeholder skills such as `Craft (Primary)` and `Lore (Specific Species)` must resolve to concrete specializations before reaching Play Mode or PDF export. Subsequent implementation and user testing exposed a wider class of unresolved or wrongly-specialized data:

- Some Mythras skills require specialization even when they appear without parentheses, such as `Navigation`, `Mysticism`, `Musicianship`, `Combat Style`, and bare `Art`/`Craft`/`Culture`/`Language`/`Lore`.
- Some parentheticals are not skill specializations at all, such as formulas, explanatory notes, `Shaping (Duration, Range, Targets, etc.)`, `Customs (Lunar Tarsh)`, `Ride (Bison)`, or `Influence (Intimidate)`.
- Passions are not ordinary skill names. Mythras Core models them as an emotional intent toward an object category, with formulas based on the target type (`references/mythras-raw/passions.json`). Factotum mirrors this with structured Description, Type, target stats, bonus, and total fields.
- Combat Styles are not free text in this Glorantha app. Combat Styles Encyclopedia is the authoritative closed vocabulary for valid Gloranthan combat styles (`references/cse-raw/combat-styles-cse.json`, promoted through `references/combat-styles.json`).
- The Random generator and manual step flow must enforce the same final validity rules while still allowing manual prompts during creation.

The policy must preserve the source-attestation chain from PDF/source JSON to inline constants and UI. It must also distinguish between character-facing skills and source/reference metadata, where bare base names can appear as labels.

## Decision Drivers

- Prevent unresolved required skill specializations from reaching Play Mode, PDF export, fixtures, or remote-published player material.
- Preserve the Mythras distinction between specialization-bearing skills, complete base skills, and non-skill Passion structures.
- Use Combat Styles Encyclopedia as the closed authority for Gloranthan combat styles instead of free text.
- Keep source-backed auto-resolution deterministic where the current culture, cult, career, or build provides enough context.
- Fail closed on malformed source strings instead of normalizing corrupted data silently.
- Allow Random to produce playable output where source data is complete, without inventing unsupported Passion subjects.
- Keep manual player choices stable when they remain valid, while recomputing auto-derived choices when their source changes.

## Considered Options

### Option 1: Keep ADR-005 placeholder-only behavior

Continue resolving `(any)` and descriptive placeholder parentheticals, but treat plain skills and concrete-looking parentheticals as valid final names.

- Good, because it minimizes code churn.
- Good, because it preserves current fixture shape for many existing characters.
- Bad, because Mythras specialization-required skills can still leak as bare `Navigation`, `Mysticism`, `Musicianship`, `Combat Style`, or `Lore`.
- Bad, because it treats Passions as strings even though Mythras Core and Factotum model them as structured intent plus object type.
- Bad, because CSE authority is not enforced for combat styles.
- Bad, because corrupted source strings can be mistaken for concrete skill names.

### Option 2: Free-text disambiguation for all parentheticals

Prompt for any parenthetical skill or Passion and allow the player/randomizer to enter or choose arbitrary text.

- Good, because it is simple to apply uniformly.
- Good, because it gives players flexibility for generic Mythras campaigns.
- Bad, because it conflicts with the app's Glorantha-specific source authority for Combat Styles Encyclopedia.
- Bad, because it would prompt for parentheticals that should normalize away, such as `Ride (Bison)`, `Shaping (Duration, Range, Targets, etc.)`, or `Literacy (Darktongue)`.
- Bad, because random generation could invent unsupported Passion subjects or combat styles.

### Option 3: Source-backed category policy with structured Passions

Classify each skill or Passion by source-backed behavior: required disambiguation, concrete resolved specialization, normalization to base skill, CSE lookup, structured Passion, or malformed-data rejection.

- Good, because it follows Mythras Core skill notes and higher-magic rules where the stored source data says an incidence must have a source/path/specialization.
- Good, because it lets the app enforce CSE as the closed combat style vocabulary.
- Good, because it represents Passions as Mythras-style structured objects instead of ambiguous strings.
- Good, because it preserves concrete source-backed skills while normalizing parentheticals that are annotations rather than specializations.
- Bad, because implementation is more complex than a regex-only placeholder detector.
- Bad, because fixtures and handouts must be regenerated after the app behavior is correct.
- Bad, because Random can no longer invent generic Passion subjects when source data lacks explicit subjects.

## Decision

Chosen option: **Source-backed category policy with structured Passions**.

Skill and Passion finalization must use these rules:

| Area | Rule |
|---|---|
| Passions | Every Passion, including `Honor`, must be represented as structured data with explicit description/type. Manual flow must prompt. Random may resolve only from explicit build/culture/cult-provided subjects. |
| Random Passion exception | Random must resolve all skills and source-backed Passions. If explicit Passion subjects are missing, Random may leave only those Passion prompts unresolved; final/export blocks until resolved. |
| Combat Style | Plain `Combat Style` and generic combat style parentheticals must resolve through CSE. Concrete styles are valid only if found or mapped in CSE. |
| Bare specialization-required skills | Bare `Art`, `Craft`, `Culture`, `Language`, and `Lore` are allowed as metadata/UI labels but must disambiguate in character skills. Plain `Lore` auto-resolves to cult lore when cult-granted and appropriate. |
| Navigation | Plain `Navigation` must disambiguate to a specific region/environment; `Navigation (Underground)` is resolved. |
| Musicianship | Plain `Musicianship` must disambiguate like Factotum; `Musicianship (Drums)` is resolved. |
| Healing and Teach | Plain skills are resolved; only `Healing (Specific Species)` and `Teach (Specific Species)` require disambiguation. |
| Devotion | Plain cult-granted `Devotion` and `Devotion (Pantheon, Cult or God)` auto-resolve from selected cult/god where available; concrete `Devotion (X)` is resolved. |
| Binding | Binding is concrete; Binding parentheticals normalize to plain `Binding` unless the AiG Spirit Rune replacement applies. |
| Invocation | Plain `Invocation`, `Invocation (Cult, School or Grimoire)`, and mistaken `Invocation (Core Sorcery)` must resolve to a specific wellspring of sorcery; concrete source-backed Invocation names are resolved. |
| Mysticism and Meditation | Plain `Mysticism` must resolve to a specific mystical path; `Meditation` is resolved. |
| Shaping | `Shaping (Duration, Range, Targets, etc.)` normalizes to plain `Shaping`. |
| Literacy and Read/Write | All Literacy forms, including `Literacy (Darktongue)`, `Literacy (New Pelorian)`, and `Read/Write (multiple)`, normalize to plain `Literacy`. |
| Customs, Ride, Influence | Parentheticals normalize to base `Customs`, `Ride`, or `Influence`; they do not prompt or randomize. |
| Rules-text parentheticals | Formulas and explanatory rules text normalize away from character skill names and remain only in rules/spell/spirit displays. |
| Malformed source strings | Malformed parenthetical strings are data defects. Validation must fail or quarantine them until normalized into canonical separate skills. |
| Lifecycle | Preserve manual valid choices. Recompute auto/context-derived choices when their source culture/career/cult/build changes. |

Final character output, fixtures, Play Mode, PDF export, agent API responses, and published handouts must not contain unresolved required skill disambiguations. The only approved unresolved state after Random is a Passion missing explicit source-backed subject, and that state blocks final/export until the player resolves it.

## Consequences

### Positive

- The app has a single source-backed policy covering manual flow, Random, fixtures, Play Mode, PDF, agent API, and handouts.
- CSE becomes the enforceable authority for combat styles, preventing unsupported free-text Gloranthan combat styles.
- Passions align with Mythras Core and Factotum-style structure instead of ambiguous display strings.
- Parentheticals that are not actual specializations stop polluting final character data.
- Malformed source data is surfaced as a blocking data-quality problem instead of silently becoming character output.

### Negative

- This supersedes parts of ADR-005 and requires broader code changes than the original placeholder detector.
- Existing fixtures must be regenerated after implementation and chaos testing; otherwise they may preserve stale string-shaped Passions or invalid skill names.
- Handouts must be updated so players understand structured Passion prompts, CSE combat style selection, and final/export blockers.
- Random generation cannot always produce fully final Passion data without explicit source-backed subjects; the UI must make the unresolved Passion exception visible and non-exportable.

### Neutral

- Source/reference JSON may still use bare base names as labels or metadata, but character-facing data must resolve or normalize according to this ADR.
- AiG replacement rules for Binding, Trance, Invocation, Shaping, and higher magic remain governed by existing magic ADRs and source-backed provider rules.

## Source Authority

| Claim | Source |
|---|---|
| Art, Craft, Culture, Language, and Lore need specific specializations/societies/languages/topics | `references/mythras-raw/professional-skills.json`; ADR-005 |
| Navigation requires a specific region or environment | `references/mythras-raw/professional-skills.json` |
| Invocation must be assigned to a specific wellspring of sorcery | `references/mythras-raw/sorcery.json` |
| Mysticism is tied to a specific mystical path; Meditation is the concentration discipline | `references/mythras-raw/mysticism.json` |
| Binding is a concrete Animism skill, not a specialization family | `references/mythras-raw/animism.json`; `references/spirits-raw/monster-island.json` |
| Shaping is one skill regardless of schools known | `references/mythras-raw/sorcery.json` |
| Passions are emotional intents toward object categories with type-dependent formulas | `references/mythras-raw/passions.json` |
| Combat Styles Encyclopedia is the combat-style authority for this app | `references/cse-raw/combat-styles-cse.json`; `references/combat-styles.json` |

## Related

- **Plan**: N/A
- **ADRs**: Supersedes and expands `docs/adr/005-placeholder-skill-disambiguation.md`; relates to `docs/adr/004-language-homeland-mapping.md`, `docs/adr/002-rune-affinity-casting-model.md`, `docs/adr/ADR-0010-culture-backed-sorcery-sources.md`, and `docs/adr/ADR-0013-source-backed-higher-magic-access.md`.
- **Implementation**: `mythras-chargen-kbrd`, `mythras-chargen-8l05`, `mythras-chargen-xxjw`, `mythras-chargen-wzjh`, `mythras-chargen-3j2d`, `mythras-chargen-px0u`, `mythras-chargen-vvxq`
