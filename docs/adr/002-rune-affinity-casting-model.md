# ADR-002: Rune Affinity Casting Model

**Status:** accepted  
**Date:** 2026-05-02  
**Deciders:** Tao Hansen, Kypris  
**Source authority:** Hannu (Notes from Pavis), AiG p.24, p.69-75

## Context

AiG states Rune Affinities replace Exhort but leaves edge cases undefined ("a draft and not complete" — Hannu). We adopt Hannu's house rules as our canonical interpretation because he's the author of the Cult One-Pagers and has run this system since 2013.

## Decision

### Casting Mechanic

**Exhort is replaced by Rune Affinities.** To cast a Theist Miracle:
1. Check if you have access (rank + cult)
2. Determine which Rune Affinity governs the spell
3. Roll against that Rune Affinity
4. Devotion determines Intensity/Magnitude
5. Spend from Devotional Pool

### Casting Rules Table

| Cult Access | Your Rune | Casting Rule |
|---|---|---|
| Allowed for all Runes | Any | Use any Rune Affinity you possess |
| Allowed for specific Rune | You have the Rune | Must use that Rune Affinity |
| Allowed for specific Rune | You don't have the Rune | Cannot cast (Cult mystery until you acquire the Rune) |
| Cult does not have the Rune | You have the Rune | You can cast using your Rune Affinity |
| Cult has spell but not the Rune | You don't have the Rune | You need to learn that rune to cast with it |

### Devotional Pool

| Rank | Pool Size |
|---|---|
| Initiate | POW / 2 |
| Acolyte (if cult has) | POW × 0.75 |
| Priest | POW |

### Spell Categories

| Category | Learning | Using | Recovery |
|---|---|---|---|
| Any Rune Spells (common) | Must have Rune Affinity (else = cult mystery) | Requires Magic Points from Devotional Pool. Long-term spells drain pool until finished | Refill at shrine/temple/holy place via ritual (ceremony, meditation, prayer). Requires sacrifice/offering |
| Normal Cult Spells | Same as Any + check Rune requisites & Initiate requirements from cult one-pager. Learned at cult temple | Use directly from Devotional Pool | Same as Any (ritual + offering at shrine/temple) |
| Subservient Cult Spells | Learned at subservient cult temple. Must have Rune Affinity (else = cult mystery) training | Use directly from Devotional Pool | Same as Any + annual temple visit required |
| Associated Cult Spells | Learned at associated cult temple. Must have Rune Affinity (else = cult mystery) | One-time use only | Must return to associated cult temple and resacrifice |

### Theist Common Magic (available to all cults)

| Rank | Runes | Spells |
|---|---|---|
| Initiate | Any | Command Cult Spirit, Extension, Find (Specific Thing), Summon Cult Spirit |
| Initiate | Magic, Mastery | Multispell |
| Initiate | Magic, Spirit | Soul Sight |
| Initiate | Spirit | Spirit Block |
| Initiate | Magic, Stasis | Warding |
| Initiate | Magic | Dismiss Magic |
| Initiate | Any | Divination |
| Priest | Any | Excommunication, Mindlink, Sanctify, Summon Spirit of Reprisal |
| Priest | Harmony | Heal Wound |
| Priest | Magic | Find Enemy |

### Rune Affinity at Character Creation

- 3 Rune Affinities assigned by player
- Values: POW×2+30%, POW×2+20%, POW×2+10% (assigned in any order)
- Rune choices should align with cult's rune associations
- Available runes: Darkness, Water, Earth, Fire/Sky, Air, Moon (elemental) + Power/Form runes

### Learning New Rune Affinities (advancement, not chargen)

- Cost: 3 Experience Rolls + 1 silver per 5% of trainer's skill + 1 silver per 10% of teaching skill
- Time: 1 week training
- Requirement: Find a trainer or teacher (on a break)
- Starting value: POW × 2

## Consequences

- Rune Affinities are mechanically skills (tracked as percentage values)
- Each miracle in data needs a `runes` field (array of rune names it can be cast with)
- "Any" rune spells can use whatever affinity the character has — most flexible
- Characters effectively limited by which 3 runes they chose at creation
- Exhort remains in SKILLS_DATA but is not used for casting (legacy/compatibility)

## Attestation

| Claim | Source |
|-------|--------|
| Casting rules table | Hannu, Discord #mythras-general, 2026-03-29 (screenshot artifact) |
| Devotional Pool sizes | Hannu, Discord #mythras-general, 2026-03-29 (screenshot artifact) |
| Common theist spells table | Hannu, Discord #mythras-general, 2026-03-29 (screenshot artifact) |
| Rune Affinity replaces Exhort | AiG p.24, `references/aig-raw/rune-affinities.json` |
| 3 affinities at creation | AiG p.24, `references/aig-raw/rune-affinities.json` |
| Learning new affinities | Hannu, Discord #mythras-general, 2026-03-29 (screenshot artifact) |
