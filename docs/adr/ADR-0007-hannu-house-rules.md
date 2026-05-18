---
title: "Hannu House Rules for Rune Magic Casting and Devotional Pool"
adr: ADR-0007
status: Accepted
date: 2026-05-17
prd: "N/A"
decision: "Adopt Hannu's house rules for rune magic casting, devotional pool sizing, and rank progression"
---

# ADR-0007: Hannu House Rules for Rune Magic Casting and Devotional Pool

## Status

Accepted

## Date

2026-05-17

## Requirement Source

- **PRD**: N/A — foundational game rules decision
- **Decision Point**: The chargen must implement Hannu's campaign-specific rules for how rune magic works in his Glorantha game, which differ from both vanilla Mythras and published AiG material.

## Context

Hannu (author of Notes from Pavis, GM of the 45-year Glorantha campaign) uses house rules that modify how rune magic casting, learning, recovery, and devotional pools work. These rules are documented on his campaign wiki and shared via Discord (2026-03-29). They replace the standard Mythras "Exhort" skill with Rune Affinities and define a structured system for spell access by rank and category.

Without documenting these rules formally, the chargen cannot correctly implement magic for theist characters in this campaign setting.

## Decision Drivers

- Chargen must match the actual rules used at the table
- ADR-003 requires all mechanics to trace to a verifiable source
- ADR-002 established Rune Affinity replaces Exhort; this ADR extends that with full casting/learning/recovery rules
- Devotional Pool sizing affects chargen resource display (POW/2 for Initiate is already implemented)

## House Rules (from Discord screenshots, 2026-03-29)

### 1. Exhort Replaced by Rune Affinities

Instead of the Exhort skill, characters use their Rune Affinities to cast spells. The casting rune depends on spell access:

| Cult Access | Your Rune | Casting Rule |
|-------------|-----------|--------------|
| Allowed for all Runes | Any | Use any Rune affinity you possess |
| Allowed for specific Rune | You have the Rune | Must use that Rune affinity |
| Allowed for specific Rune | You don't have the Rune | Cannot cast (Cult mystery until you acquire the Rune) |
| Cult does not have the Rune | You have the Rune | You can cast using your Rune affinity |
| Cult has spell but not the Rune | You don't have the Rune | You need to learn that rune to cast with it |

### 2. Rune Spells — Learning, Use, Recovery

**General requisites for learning a spell:**
- Cost: 5 XP rolls + 500L + 1 week training
- Must be correct rank to learn it (Initiate, Acolyte, Priest...)
- One week of training
- Check Rune requisites from cult one-pager

**Spell Categories:**

| Category | Learning | Using | Recovery | Examples (Orlanth) |
|----------|----------|-------|----------|-------------------|
| Any Rune Spells | Must have Rune affinity (else = cult mystery) | Requires enough Magic Points in Devotional Pool. Long-term spells drain pool until finished | Refill Devotional Pool by ritual at shrine/temple/holy place. Ritual = ceremony, meditation, or prayer. Requires sacrifice/offering (animal, wealth, gift) | Initiate: Extension, Find Specific Thing, Divination. Runelord: Excommunication, Mindlink, Sanctify, Summon Spirit of Reprisal |
| Normal Cult Spells | Same as Any (Rune affinity, cost, training, rank). Also check Rune requisites & Initiate requisites (cult one-pagers). Learned at cult temple | Use directly from Devotional Pool | Same as Any (ritual + offering at shrine/temple) | Initiate: Decrease Wind, Summon Sylph, Increase Wind, Wind Warp. Runelord: Call Winds, Summons of Evil |
| Subservient Cult Spells | Learned at subservient cult temple (e.g. Orlanth Adventurous, Orlanth Thunderous in Hombori Tondo). Must have Rune affinity (else = cult mystery) training | Use directly from Devotional Pool | Same as Any (ritual + offering at shrine/temple). Annual temple visit required | Initiate: Wind Words, Dark Walk, Cloud Call, Shield, Summon Large Sylph, Lightning, etc. Runelord: Bless Thunderstone, Bless Woad, Earth Shield |
| Associated Cult Spells | Learned at associated cult temple (in Hombori Tondo: Lhankhor Mhy, Eurmal, Issaries, Chalana Arroy). Must have Rune affinity (else = cult mystery) | One-time use only | Must return to associated cult temple and resacrifice for associated cult spell to regain spell | Initiate: Analyze Magic, Charisma, Face Chaos, Rain, Restore Health, etc. Runelord: Guided Teleportation, Heal Body, Bear's Strength |

### 3. Theist Common Magic with Runes

| Rank | Cult | Relation | Runes | Spells |
|------|------|----------|-------|--------|
| Initiate | Any | Cult | Any | Command Cult Spirit, Extension, Find (Specific Thing), Summon Cult Spirit |
| Initiate | Any | Cult | Magic, Mastery | Multispell |
| Initiate | Any | Cult | Magic, Spirit | Soul Sight |
| Initiate | Any | Cult | Spirit | Spirit Block |
| Initiate | Any | Cult | Magic, Stasis | Warding |
| Initiate | Any | Cult | Magic | Dismiss Magic |
| Initiate | Any | Cult | Any | Divination |
| Priest | Any | Cult | Any | Excommunication, Mindlink, Sanctify, Summon Spirit Of Reprisal |
| Priest | Any | Cult | Harmony | Heal Wound |
| Priest | Any | Cult | Magic | Find Enemy |

### 4. Devotional Pool Size

- Initiate = POW/2
- Acolyte (if cult has) = POW×0.75
- Priest = POW

### 5. Sorcery Adaptation (from AiG p.60)

- Invocation → Rune Affinity of the spell
- Shaping → Law Rune affinity

### 6. Mysticism

- Path of Immanent Mastery "might" use it (Discord 2026-05-17)
- No published one-pager data exists yet

### 7. Rank Progression Timing

- Proven: 1 year
- Overseer: 1 year
- Leader: 2 years

## Considered Options

### Option 1: Implement vanilla Mythras Exhort rules

- Good, because simpler and matches published book
- Bad, because doesn't match the actual game being played
- Bad, because Hannu's players use Rune Affinities, not Exhort

### Option 2: Adopt Hannu's house rules (chosen)

- Good, because matches the actual table rules
- Good, because already partially implemented (ADR-002 established Rune Affinity casting)
- Good, because provides richer chargen experience with devotional pool display
- Bad, because not published in any official source — requires Discord citation

## Decision

Chosen option: **"Adopt Hannu's house rules"**, because the chargen is built for this specific campaign and must reflect the rules actually used at the table.

## Consequences

### Positive

- Chargen correctly displays Devotional Pool (POW/2 for Initiate)
- Spell access rules are documented for future UI enhancements (spell filtering by rank/rune)
- Clear source trail for all magic mechanics

### Negative

- Rules may change as Hannu refines them — ADR must be updated
- Some rules (Acolyte pool, Associated cult one-time-use) are not yet implemented in chargen

### Neutral

- Mysticism remains a stub until Hannu publishes cult data

## Source Citations

- **Discord screenshots (2026-03-29):**
  - `/home/worldofgeese/Downloads/2026-03-29_11-21-56.webp` — Theist Common Magic with Runes table
  - `/home/worldofgeese/Downloads/2026-03-29_11-23-31.webp` — Casting Rune Spells table + 5 example situations
  - `/home/worldofgeese/Downloads/2026-03-29_11-28-00.webp` — Rune Spells Learning/Use/Recovery table
  - `/home/worldofgeese/Downloads/2026-03-29_11-29-56.webp` — Devotional Pool Size
- **Discord conversation (2026-05-17):** Mysticism — "Path of Immanent Mastery might. I have created couple that are not in onepager format (yet)."
- **AiG p.60:** Sorcery adaptation (Invocation → Rune Affinity, Shaping → Law Rune)

## Related

- **ADRs**: Extends ADR-002 (Rune Affinity Casting Model). Referenced by ADR-0006 (Full Magic System Coverage).
- **Plan**: `docs/plans/2026-05-17-005-fix-data-integrity-and-attestability.md` (U4)
- **Implementation**: Devotional Pool (POW/2) already in `index.html`. Casting rules inform future spell picker filtering.
