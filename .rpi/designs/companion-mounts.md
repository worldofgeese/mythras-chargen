# Design: Companion Mounts for Pre-gen Characters

**Status:** active
**Date:** 2026-05-04
**Upstream:** Research (Vasana/Ionara pre-gen folios, Classic Fantasy Animal Training)

## Problem

Vasana and Ionara (RQG pre-gens converted to Mythras) each have animal companions/mounts with full combat stat blocks. The current CharacterData model has no field for storing companion creatures. The mounts need to:
- Display in Play Mode with their own stat block
- Export to PDF alongside the character
- Persist in JSON save/load
- Be editable (HP tracking in play)

## Research Findings

1. **Classic Fantasy Animal Training (p.71)** — A professional skill (POW+CHA) for teaching animals tricks. NOT needed for our use case. Our mounts are pre-trained cavalry animals, not "pets being trained."

2. **Mythras Core already handles mounts** via:
   - Ride skill (character's ability to control mount)
   - Mounted Combat trait (ignore Ride skill cap on combat)
   - Beast-back Lancer trait (no penalty for mounted charges)
   - Damage bonus: mount's DB applies to lance charges

3. **What's missing**: Structured storage for the mount's own characteristics, hit locations, attacks, and combat stats.

4. **No Grazelander culture** exists in CULTURES_DATA. The 8 AiG cultures don't include it. Ionara's fixture uses "Grazelander/Pure Horse" — this is acceptable for pre-gen fixtures (charMethod: "pregen") that bypass the generator.

## Decision

### Companion Data Model

Add `companions` array to CharacterData:

```javascript
companions: [
  {
    name: "Molon",
    species: "Bison (War-trained)",
    characteristics: { STR: 36, CON: 17, SIZ: 34, DEX: 12, POW: 10 },
    hitPoints: {
      "Right Hind Leg": { current: 8, max: 8 },
      "Left Hind Leg": { current: 8, max: 8 },
      "Hindquarters": { current: 10, max: 10 },
      "Forequarters": { current: 10, max: 10 },
      "Right Foreleg": { current: 8, max: 8 },
      "Left Foreleg": { current: 8, max: 8 },
      "Head": { current: 9, max: 9 }
    },
    attacks: [
      { name: "Head Butt", skill: 50, damage: "2D10+3D6", notes: "Cannot also Trample same round" },
      { name: "Trample", skill: 50, damage: "6D6", notes: "Against downed foe only" }
    ],
    armor: 3,
    movement: 12,
    damageModifier: "+3D6",
    attributes: { hitPointsTotal: 23, healingRate: 3, strikeRank: 3 },
    notes: "War-trained cavalry bison. Use mount's DB for lance charges."
  }
]
```

### Source Precedence

- Mount stat blocks: RQG Starter Set pre-gen folios (primary for pre-gen rebuild)
- Mythras characteristic ranges: Mythras Core creature chapter (for validation)
- Combat mechanics: Mythras Core mounted combat rules
- Culture/career data: AiG (unchanged — mounts are gear, not culture features)

### What We Don't Need

- Classic Fantasy's Animal Training skill (not relevant to cavalry mounts)
- A Grazelander culture in CULTURES_DATA (pre-gens bypass generator)
- Any changes to the random character generator (companions are manual/pre-gen only)

## Implementation Scope

1. **Add `companions` array field** to CharacterData initialization
2. **Render companions in Play Mode** — collapsible section below main character stats
3. **Include in PDF export** — companion stat block section
4. **Persist in JSON save/load** — companions array serializes/deserializes
5. **Rebuild Vasana fixture** — full Mythras stats with Molon companion
6. **Rebuild Ionara fixture** — full Mythras stats with Etza companion
7. **Companion HP tracking** in Play Mode (clickable hit locations)

## Out of Scope

- Adding Grazelander as a generator-supported culture (separate initiative if needed)
- Classic Fantasy Animal Training skill integration
- Automatic companion generation in random character mode
- Companion spell/magic tracking (mounts don't cast spells)
