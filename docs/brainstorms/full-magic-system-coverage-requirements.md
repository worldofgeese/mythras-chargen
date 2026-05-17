---
date: 2026-05-16
topic: full-magic-system-coverage
---

# Full Magic System Coverage

## Summary

Expand the chargen from 2 magic systems (Folk Magic + Theism) to all 5 Mythras magic systems: Folk Magic, Rune Magic (Theism), Animism, Sorcery, and Mysticism. Each system uses its own mechanics, resource pools, and casting rules per Hannu's confirmed approach. This supersedes ADR-001's "exactly two systems" decision.

---

## Problem Frame

ADR-001 decided to implement only Folk Magic and Theist Miracles, reasoning that all 286 cult one-pagers use a unified "Theist Miracles" heading. Analysis of the one-pager data reveals this was a data-format convenience, not a mechanical unification:

- 5 cults (Daka Fal, Aldrya Shaman, Hearth Mother, Jokotu, Arkat) lack Devotion entirely — they cannot use the Devotional Pool
- 33 cults list Trance/Binding as cult skills, signaling animist mechanics
- 6 cults list Invocation/Shaping, signaling sorcery mechanics
- Hannu (one-pager author, running Glorantha with Mythras since 2013) confirms he uses all five systems: "Mysticism raw. Sorcery raw but lots of spells from many sources. Animism raw. Rune magic AiG. Folk magic AiG."

The current chargen would incorrectly assign a Devotional Pool to pure animist/sorcery cults and display wrong casting skills on the character sheet.

---

## Actors

- A1. Player: Selects a cult during chargen and needs to see the correct magic system, resource pool, and casting skills for that cult
- A2. GM (Hannu's table style): Expects character sheets that reflect the actual mechanical system the cult uses

---

## Requirements

**Cult type detection**

- R1. The chargen must detect which magic system a cult uses based on its cult skill pattern: Devotion + Runic Affinity = Theist; Trance/Binding without Devotion = pure Animist; Invocation/Shaping without Devotion = pure Sorcery; Devotion + Trance/Binding = hybrid Theist+Animist; Devotion + Invocation/Shaping = hybrid Theist+Sorcery.
- R2. Hybrid cults (those with both Devotion and Trance/Binding or Invocation/Shaping) must display both systems' resources and skills.

**Source books per system**

- R3. Folk Magic uses AiG rules (progressive folk magic with house rule, already implemented).
- R4. Rune Magic (Theism) uses AiG rules with Hannu's house rules (already implemented per ADR-002).
- R5. Animism uses Mythras Core Rulebook mechanics ("raw"), with one adaptation: Binding skill is replaced by Spirit Rune affinity.
- R6. Sorcery uses Mythras Core Rulebook mechanics ("raw"), with AiG's Rune Affinity overlay: Invocation → Rune Affinity of the spell; Shaping → Law Rune affinity.
- R7. Mysticism uses Mythras Core Rulebook mechanics ("raw").

**Resource pools and limits per system**

- R8. Theist cults display Devotional Pool (POW/2 for Initiates, POW×0.75 for Acolytes, POW for Priests).
- R9. Animist cults display bound spirit slots (CHA/2 max) and max controllable spirit POW (3× critical range of appropriate Rune Affinity).
- R10. Sorcery cults display Magic Points as the casting resource and Law Rune affinity for shaping limits.
- R11. Mysticism cults display the appropriate Mythras Core resource (Meditation skill governs mystical abilities).

**Casting skills on character sheet**

- R12. Theist cults show Rune Affinity as casting skill and Devotion for intensity (per ADR-002).
- R13. Animist cults show Spirit Rune affinity as the primary interaction skill (replaces Trance and Binding per AiG + Hannu).
- R14. Sorcery cults show Rune Affinity of the spell for casting and Law Rune affinity for shaping.
- R15. Mysticism cults show Mysticism and Meditation skills per Mythras Core.

**Spell selection**

- R16. Spell selection at chargen remains unified: player picks spells from their cult's one-pager list regardless of magic system. The one-pager data already contains the correct spells for each cult.
- R17. Spells tagged "(sorcery)" in the one-pager data must be labeled as sorcery spells on the character sheet.

---

## Acceptance Examples

- AE1. **Covers R1, R8, R12.** Given a player selects Orlanth Adventurous (has Devotion + Runic Affinity, no Trance/Binding), the chargen shows "Devotional Pool: [POW/2]" and "Casting: Rune Affinity" on the character sheet.
- AE2. **Covers R1, R9, R13.** Given a player selects Daka Fal (has Trance/Binding, no Devotion), the chargen shows "Bound Spirit Slots: [CHA/2]" and "Casting: Spirit Rune" — not Devotional Pool.
- AE3. **Covers R1, R10, R14.** Given a player selects Arkat (has Invocation/Shaping, no Devotion), the chargen shows "Resource: Magic Points" and "Casting: Rune Affinity + Law Rune (shaping)" — not Devotional Pool.
- AE4. **Covers R2.** Given a player selects Waha (has Devotion AND Trance/Binding), the chargen shows both Devotional Pool and bound spirit slot information.

---

## Success Criteria

- A player selecting any of the 94 supported cults sees the mechanically correct magic system, resource pool, and casting skills for that cult
- The character sheet produced is consistent with how Hannu runs these systems at the table
- No cult incorrectly displays a Devotional Pool when it lacks Devotion in its cult skills
- The ADR superseding ADR-001 is accepted and documents the source authority for each system

---

## Scope Boundaries

- Mysticism is supported in the data model but may have zero cults in the current data (no Kralori cultures in the 8 AiG cultures) — the system exists for future use
- Full gameplay mechanics (spirit combat resolution, sorcery shaping in play, mysticism meditation paths) are not part of chargen — only creation-time choices and sheet display
- Lunar Magic is not a separate system — Lunar cults (Jakaleel, etc.) use Theist mechanics with the Moon Rune per the one-pagers
- The upcoming new version of the one-pagers from Hannu may change cult data — the system should be resilient to data updates

---

## Key Decisions

- **All five Mythras systems supported**: Matching Hannu's confirmed approach rather than the simplified two-system model from ADR-001
- **Mythras Core ("raw") for Animism, Sorcery, Mysticism**: AiG's Sorcery and Mysticism chapters were never published; Animism chapter exists in AiG but Hannu uses "raw" Mythras with Spirit Rune replacing Binding
- **Cult type detected from skill patterns**: No manual tagging needed — the one-pager cult skills already encode which system applies
- **Spell selection remains unified**: The one-pagers already list the correct spells per cult regardless of system; the difference is in mechanics/resources, not spell availability
- **Supersedes ADR-001**: The "exactly two systems" decision was based on incomplete analysis of the one-pager data structure

---

## Dependencies / Assumptions

- Mythras Core Rulebook (3rd Printing, 2018) is the mechanical source for Animism, Sorcery, and Mysticism — needs OCR/extraction of relevant chargen rules
- AiG Spirit Magic chapter (p.134-151) is available in OCR and confirms Spirit Rune replaces Binding
- Hannu's confirmation (Discord, 2026-05-16) is the source authority for the approach: "Mysticism raw. Sorcery Raw. Animism raw. For animism replaced binding with spirit rune affinity"
- New one-pager versions are forthcoming from Hannu — data pipeline should handle updates

---

## Outstanding Questions

### Resolve Before Planning

(None — all blocking questions resolved.)

### Deferred to Planning

- [Affects R2][Resolved] For hybrid cults: "(Shaman)" suffix indicates skills available to the shaman path within the cult. Hannu says "you could do either way" — treat as a GM-configurable option. Show both systems' resources; let player choose path.
- [Affects R9][Resolved 2026-05-16] Extracted spirit creation rules from Monster Island (`references/spirits-raw/monster-island.json`) and spirit descriptions from A Bird in the Hand (`references/spirits-raw/bird-in-hand.json`). Monster Island approach: Spirit Worshippers start with 2-3 intensity 1-2 spirits. Community precedent confirmed: 2 intensity-2 spirits.
- [Affects R9][Pending] Review Hannu's updated Waha one-pager (still under development) for any new spirit data or structure changes.
- [Affects R10][Resolved 2026-05-16] Extracted Mythras Core sorcery chargen rules to `references/mythras-raw/sorcery.json`. Key: Invocation (INT×2) determines Intensity (skill/10); Shaping (INT+POW) determines shaping points (skill/10). One school chosen at creation. Resource = Magic Points.
- [Affects R11][Resolved 2026-05-16] Extracted Mythras Core mysticism chargen rules to `references/mythras-raw/mysticism.json`. Key: Mysticism skill tied to one path; Meditation governs max active talent Intensity (skill/10). No external resource consumed. Zero current cults use this.
- [Affects R5][Resolved 2026-05-16] All three Mythras Core magic system rules extracted to `references/mythras-raw/{animism,sorcery,mysticism}.json` with page citations. Marked `verified: false` per ADR-003.
