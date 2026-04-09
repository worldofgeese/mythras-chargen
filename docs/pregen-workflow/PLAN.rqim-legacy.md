# Mythras + Glorantha Starter-Set Conversion Plan

## Historical Note

This file is retained as the original implementation plan.

The **current authoritative policy** now lives in `README.md` and the Codex skill, and differs from the initial draft in three important ways:

- all starter-set pregens are rebuilt from a strict **75-point Mythras Core** characteristic base
- all finished sheets use **only Mythras Core skills and specialisations**
- rune magic follows **Adventures in Glorantha** with rune-affinity casting and devotional pools

## Summary
Build a **starter-set conversion kit** that keeps **Mythras core mechanics as the engine** and layers **Glorantha identity through rune affinities, cult handouts, and folk magic/devotional magic**. The default approach is:

- Keep Mythras combat, skills, passions, action economy, and combat styles.
- Convert RuneQuest starter-set pregens into Mythras character sheets rather than running the RQ sheets mostly unchanged.
- Treat **Runes as explicit character-facing affinities** used to qualify and augment rune magic, instead of using legacy point-spend rune casting.
- Use the cult one-pagers as the main cult reference/player handout layer.

## Key Changes
### Character conversion
- Replace individual RQ weapon skills with 1-3 appropriate **Mythras combat styles** per pregen.
- Rebuild each pregen on a Mythras-style sheet with Mythras standard derived values, skills, passions, equipment formatting, and AP economy.
- Drop **Strike Rank** entirely; use Mythras initiative/action rules.
- Convert any RQ-only fields on the folios into one of:
  - direct Mythras equivalent,
  - rune affinity entry,
  - passion/cult note,
  - or remove if it has no Mythras function.

### Rune and magic model
- Give each character about **3 rune affinities** tied to their cult/background; record them on the sheet as named affinities, not hidden GM metadata.
- Use rune affinities as the gate for **rune spell access** and as automatic or declared augments where appropriate.
- Do **not** use the legacy point-spend rune-casting model.
- Keep **folk magic** available broadly.
- Keep **devotion/exhort** available for cult play, but treat rune affinities as the primary rune-magic interface for this conversion.
- For any spell from *Adventures in Glorantha* that assumes incomplete edge-case rules, define a short per-spell conversion note:
  - required rune affinity/runes,
  - resource cost in Mythras terms,
  - action/casting handling,
  - duration/range/effect wording only where needed to remove ambiguity.

### Cult integration
- For each starter-set pregen, map them to the relevant **cult one-pager** and use that as the player-facing cult packet.
- Use the cult sheet to determine expected runes, passions, obligations, and likely magic emphasis.
- Where a starter-set cult presentation and one-pager differ, favor the one-pager for Mythras-facing mechanics and keep starter-set lore text/adventure hooks.

### Adventure and encounter conversion
- Convert NPCs and monsters to Mythras only when they matter at the table; avoid full bestiary conversion up front.
- Use Mythras encounter/creature material as the baseline and add Gloranthan flavor via cult, runes, spirits, and setting tags.
- Review each starter-set adventure scene for rules assumptions that need replacement:
  - Strike Rank references,
  - legacy divine-refresh assumptions,
  - RQ-specific skill lists,
  - weapon-skill references,
  - spirit/rune magic calls.
- Produce a short GM checklist per adventure covering only those replacement points.

## Public Interfaces / Artifacts
The implementation should produce these concrete outputs:

- A **conversion guide** that states the campaign defaults above in one place.
- A **pregen conversion template** with fixed fields:
  - Mythras combat styles
  - rune affinities
  - folk magic
  - devotional/cult abilities
  - passions
  - removed RQ-only fields
- A **spell conversion worksheet** for AiG rune spells with columns for:
  - original spell
  - required rune affinity
  - Mythras resource/cost
  - casting/action notes
  - unresolved edge case
- An **adventure prep checklist** for each starter-set scenario.

## Test Plan
- Convert one representative pregen, preferably **Varnas**, end-to-end and verify:
  - weapon skills became sensible combat styles,
  - rune affinities are visible and usable,
  - no legacy point-spend rune economy remains,
  - sheet is playable under Mythras without cross-referencing RQ combat rules.
- Run a spell check pass on 3-5 rune/divine effects to confirm the affinity model is enough to cast and adjudicate them consistently.
- Run one encounter from the starter set and confirm:
  - initiative/AP flow works cleanly,
  - no Strike Rank dependency remains,
  - cult/rune identity still feels Gloranthan.
- Review one cult handout against one converted pregen to confirm the runes, passions, and cult abilities agree.

## Assumptions and Defaults
- The plan optimizes for **playable Mythras-first conversion**, not strict emulation of modern RuneQuest rules.
- **Rune affinities** are the campaign default because they preserve visible Gloranthan identity on the character sheet with less bookkeeping than legacy point-spend rune casting.
- The scope is the **RuneQuest Starter Set first**, not full Glorantha chargen support.
- The cult one-pagers are treated as the main cult-mechanics reference unless a starter-set scenario requires a specific exception.
- Full conversion of every NPC/monster/spell is out of scope initially; convert on demand after the pregens and first adventures are stable.
