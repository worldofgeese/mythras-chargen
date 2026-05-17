---
title: "Support All Five Mythras Magic Systems"
adr: ADR-0006
status: Accepted
date: 2026-05-16
prd: "N/A"
decision: "Implement all five Mythras magic systems using AiG for Folk Magic and Rune Magic, Mythras Core for Animism, Sorcery, and Mysticism"
---

# ADR-0006: Support All Five Mythras Magic Systems

## Status

Accepted

## Date

2026-05-16

## Requirement Source

- **PRD**: N/A (foundational decision arising from data analysis and author consultation)
- **Decision Point**: ADR-001 incorrectly concluded that only 2 magic systems were needed. One-pager skill pattern analysis and Hannu's confirmation reveal all 5 systems are in use.

## Context

ADR-001 (2026-05-02) decided to implement exactly 2 magic systems (Folk Magic + Theist Miracles), reasoning that all 286 cult one-pagers use a unified "Theist Miracles" heading. This was a data-format observation mistaken for a mechanical unification.

Analysis of the cult skill patterns in the one-pagers reveals three distinct categories:

| Category | Skill Pattern | Cults | Correct System |
|----------|--------------|-------|----------------|
| Pure Theist | Devotion + Runic Affinity | ~55 cults | Rune Magic (Theism) |
| Pure Animist | Trance/Binding, NO Devotion | 4 cults (Daka Fal, Aldrya Shaman, Hearth Mother, Jokotu) | Spirit Magic (Animism) |
| Pure Sorcery | Invocation/Shaping, NO Devotion | 1 cult (Arkat) | Sorcery |
| Hybrid Theist+Animist | Devotion + Trance/Binding(Shaman) | ~29 cults (Waha, Storm Bull, Eiritha, etc.) | Both systems |
| Hybrid Theist+Sorcery | Devotion + Invocation/Shaping | 2 cults (Ompalam, Pavis) | Both systems |

Pure animist and sorcery cults lack Devotion entirely — they cannot use the Devotional Pool. The current chargen incorrectly assigns a Devotional Pool to these cults.

Hannu (one-pager author, running Glorantha with Mythras since 2013) confirmed on Discord (2026-05-16):

> "Mysticism raw. Sorcery Raw but lots of spells from many sources. Animism raw. Rune magic AiG. Folk magic AiG."
> "For animism replaced binding with spirit rune affinity."

AiG's Sorcery chapter (p.123-133) was never published — the printed book jumps from page 122 to 134. Mysticism and Lunar Magic chapters were also never written. Only the Spirit Magic chapter (p.134-151) exists alongside Folk Magic and Rune Magic.

## Decision Drivers

- All data must be attestable to a source we maintain as JSON extracted from its source (ADR-003)
- Pure animist/sorcery cults cannot use the Devotional Pool (they lack Devotion in cult skills)
- Hannu explicitly runs all 5 systems at his table using Mythras Core ("raw") for Animism, Sorcery, and Mysticism
- AiG's Sorcery and Mysticism chapters were never published — Mythras Core is the only source
- The one-pager data already encodes which system each cult uses via cult skill patterns
- Character sheets must reflect the actual mechanical system for correct play

## Considered Options

### Option 1: Keep ADR-001 (Folk Magic + Theism only)

Treat all cult spells as Theist Miracles regardless of cult type. Simple unified model.

- Good, because no additional implementation work
- Good, because spell selection UI stays identical
- Bad, because 5 cults get incorrect Devotional Pool display
- Bad, because character sheets show wrong casting skills for animist/sorcery cults
- Bad, because contradicts how Hannu (the source authority) actually runs the game

### Option 2: All five systems with correct mechanics

Detect cult type from skill patterns. Use AiG for Folk Magic + Rune Magic, Mythras Core for Animism + Sorcery + Mysticism. Apply AiG's Rune Affinity adaptations where specified.

- Good, because mechanically correct for all 94 supported cults
- Good, because matches Hannu's confirmed approach
- Good, because cult type detection is automatic from existing data (no manual tagging)
- Good, because spell selection remains unified (one-pagers already list correct spells per cult)
- Bad, because requires OCR/extraction of Mythras Core Animism, Sorcery, and Mysticism chapters
- Bad, because spirit stats at chargen need research (Monster Island, A Bird in the Hand)
- Bad, because more complex data model (multiple resource types, casting skill variants)

### Option 3: Add Animism only, defer Sorcery and Mysticism

Fix the 33 animist cults (the largest gap) but leave 6 sorcery cults and 0 mysticism cults for later.

- Good, because addresses the largest mechanical gap (33 cults vs 6)
- Good, because AiG Spirit Magic chapter is available (no need for Mythras Core extraction)
- Bad, because Arkat cult still gets wrong mechanics
- Bad, because doesn't match Hannu's full approach
- Bad, because creates a partial state that still needs future work

## Decision

Chosen option: **"All five systems with correct mechanics"**, because Hannu (the source authority for this project) explicitly runs all five systems, the cult skill data already encodes which system each cult uses, and producing incorrect character sheets for known cults contradicts the project's attestable data chain principle (ADR-003).

## Consequences

### Positive

- Every cult in the chargen produces a mechanically correct character sheet
- The system matches how the one-pager author actually runs Glorantha
- Cult type detection is automatic — no manual tagging needed as new one-pagers arrive
- Future-proof for Hannu's upcoming new one-pager versions

### Negative

- Requires extraction of Mythras Core rules for 3 additional magic systems into attestable JSON (per ADR-003's data chain requirement)
- Spirit stats at chargen need research from Monster Island and A Bird in the Hand — must be extracted to JSON with page citations before use (no canonical source exists yet; even Hannu hasn't created them)
- More complex data model with system-specific resource pools and casting skills
- Mysticism may have zero cults in the current data (no Kralori cultures in 8 AiG cultures) — implemented but unused until cultures expand

### Neutral

- Spell selection at chargen remains unified regardless of system — the one-pagers list the correct spells per cult under the "miracles" heading
- The "(Shaman)" suffix on hybrid cult skills is a GM-configurable option per Hannu — chargen shows both systems' resources

## Source Authority

Every data constant must trace to a verifiable source maintained as JSON (per ADR-003). The attestation chain for each system:

| System | Source PDF | Extracted JSON (required) | Adaptation |
|--------|-----------|--------------------------|------------|
| Folk Magic | AiG (p.63-68) | `references/aig-raw/folk-magic-aig.json` ✔ | Progressive folk magic with house rule |
| Rune Magic (Theism) | AiG (p.69-122) + Hannu's house rules | `references/theism-miracles.json` ✔ | Exhort → Rune Affinity (ADR-002) |
| Animism (Spirit Magic) | Mythras Core Rulebook (3rd Printing, 2018) | `references/mythras-raw/animism.json` ✔ | Binding → Spirit Rune affinity |
| Animism (Spirits) | Monster Island + A Bird in the Hand | `references/spirits-raw/monster-island.json` ✔, `references/spirits-raw/bird-in-hand.json` ✔ | Spirit stats for chargen |
| Sorcery | Mythras Core Rulebook (3rd Printing, 2018) | `references/mythras-raw/sorcery.json` ✔ | Invocation → Rune Affinity; Shaping → Law Rune (AiG p.60 overview) |
| Mysticism | Mythras Core Rulebook (3rd Printing, 2018) | `references/mythras-raw/mysticism.json` ✔ | None specified |

No data may enter the chargen without a corresponding reference JSON file with page citations. LLM-generated content must be marked "UNVERIFIED" until human-verified against the source PDF.

## Related

- **ADRs**: Supersedes `docs/adr/001-magic-system-architecture.md` (ADR-001). Extends `docs/adr/002-rune-affinity-casting-model.md` (ADR-002, Theist casting rules remain unchanged).
- **Requirements**: `docs/brainstorms/full-magic-system-coverage-requirements.md`
- **Source artifacts**: `docs/adr/artifacts/hannu-casting-rules-2026-03-29.md`, Hannu Discord confirmation 2026-05-16
- **Research sources**: Monster Island PDF, A Bird in the Hand PDF, Hannu's updated Waha one-pager (under development)
