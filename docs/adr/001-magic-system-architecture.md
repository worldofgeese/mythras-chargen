# ADR-001: Magic System Architecture

**Status:** accepted  
**Date:** 2026-05-02  
**Deciders:** Tao Hansen, Kypris  

## Context

The mythras-chargen app targets Glorantha using Mythras (Adventures in Glorantha) rules. Mythras Core defines 5 magic systems (Folk Magic, Theism, Animism, Sorcery, Mysticism). The question: which do we implement?

## Evidence

### Source 1: Glorantha Cult One-Pagers (Notes from Pavis, 2019 edition v5.2)

286 cult PDFs across 20 pantheon folders. Every single cult — including shamanic spirit societies — uses the same data structure:
- Folk Magic (spell list)
- **Theist Miracles** (Initiate + Runelord spell lists)

No cult has a separate "sorcery spells" or "spirit bindings" or "mysticism abilities" section. Even "Shaman Spirit Society" uses "Theist Miracles" as its heading.

### Source 2: Adventures in Glorantha (GenCon 2015 Preview)

- p.24: Character creation Step 5 gives 3 Rune Affinities (POW×2+30/20/10%)
- p.24: Rune Affinities replace Exhort for casting (rune-affinities.json: "the skill of Exhort is now replaced by whatever Rune Affinity controls the particular spell being cast")
- p.63-68: Folk Magic rules
- p.69-75: Rune Magic overview (theist miracles via rune affinities)
- p.123-133: Sorcery overview (exists in book but NO cult data supports it for our 8 cultures)
- p.134-151: Spirit magic overview (exists in book but folded into Theist Miracles in one-pagers)

### Source 3: Hannu (Notes from Pavis author, Discord #mythras-general, 2026-03-29)

Running Glorantha with Mythras/RQ6 since 2013. Confirms:
- "You can either go with folk magic/devotion/exhort with runes as passions or you can replace exhort with runes as rune affinities"
- Uses Rune Affinities approach with house rules for edge cases
- The One-Pagers have ~150 cults translated to Mythras
- AiG is "a draft and not complete in certain edge cases"

### Source 4: Cult Spell Catalogues (upstream PDFs)

Per-pantheon tables listing Folk Magic + Theist Miracles per cult, with rune prefix codes indicating which Rune Affinity governs each miracle.

## Decision

**We implement exactly two magic systems:**

1. **Folk Magic** — universal, from culture/career (already implemented)
2. **Theist Miracles via Rune Affinities** — cult-based, using Devotion + Rune Affinity casting

**We do NOT implement** Sorcery, Mysticism, or Animism as separate systems because:
- No upstream cult data supports them for our 8 AiG cultures
- The one-pagers fold all cult magic into the Theist Miracles framework
- Malkion (sorcery) only has 2 cults (Arkat, Dormal) and neither is in our 94
- Kralorela (mysticism) is not in our 8 supported cultures

## Implementation

### Folk Magic (existing)
- Skill: Folk Magic (POW+CHA+30% at creation)
- Spells: 3 from culture + 2 from career
- Source: `CULTS_DATA[].folkMagic` + culture folk magic lists

### Theist Miracles (new)
- Casting skill: Rune Affinity (replaces Exhort)
- Intensity/Magnitude: Devotion skill
- Resource: Devotional Pool (POW/2 for Initiates)
- Spells: per-cult from Spell Catalogue PDFs
- Source: `CULTS_DATA[].miracles` (to be populated)

### Rune Affinities (new)
- 3 at character creation: POW×2+30%, POW×2+20%, POW×2+10%
- Player assigns runes in any order
- Used as casting skill for Theist Miracles
- Advancement: POW×2 base, costs 3 XP rolls + silver + trainer

## Consequences

- Characters without cult membership have no Theist Miracles (Folk Magic only)
- The Devotion skill exists in SKILLS_DATA but gains mechanical meaning
- Exhort skill becomes vestigial (kept for compatibility but not used for casting)
- Rune Affinities become a new CharacterData field
- Each miracle needs a rune tag for determining which affinity to roll

## Attestation

| Claim | Source | Page/Location |
|-------|--------|---------------|
| AiG uses Rune Affinities | `references/aig-raw/rune-affinities.json` | p.24 |
| 3 affinities at POW×2+30/20/10 | `references/aig-raw/rune-affinities.json` | p.24 |
| All one-pager cults use Theist Miracles | `references/cults-upstream/` (286 PDFs) | Cult header format |
| Hannu's casting rules | `docs/adr/artifacts/hannu-casting-rules-2026-03-29.md` | Discord conversation |
| Spell catalogues with rune codes | `references/cults-upstream/*/Spell Catalogue.pdf` | All pantheons |
