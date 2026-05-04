# Design: Deterministic Pre-gen Conversion Pipeline v2

**Status:** active
**Date:** 2026-05-04
**Upstream:** RQG Starter Set - Pregen Folios.pdf (primary source of truth)

## Problem

The app needs all 10 RQG Starter Set pre-gen characters as loadable fixtures in the current schema format (exemplified by vasana.json/ionara.json). The old deprecated pipeline required external dependencies not in this repo. We need a self-contained, deterministic pipeline that:
1. Takes manually-transcribed RQG folio data as structured intermediate JSON
2. Applies RQG→Mythras conversion rules
3. Outputs fixture JSON files that load correctly in the app
4. Includes companion stat blocks for characters with mounts/pets

## Source-of-Truth Precedence

1. **RQG Starter Set Pregen Folios PDF** — primary for all character data (stats, skills, weapons, magic, companions)
2. **Adventures in Glorantha** — for Mythras combat style traits, folk magic spell lists, culture mappings
3. **Mythras Core** — for derived attribute formulas, skill base calculations, 75-point characteristic scaling
4. **Notes from Pavis / CULTS_DATA** — for miracle validation (miracles must exist in the app's cult database)
5. **House rules** — documented in ADRs when we deviate (e.g., custom combat style names)

## Characters & Their Data

| Character | Cult | Companions | CULTS_DATA status |
|-----------|------|-----------|----------|
| Vasana | Orlanth (Vinga Adventurous) | Molon (war bison) | **exists** |
| Yanioth | Ernalda | Earth Elemental (summoned) | **exists** |
| Harmast | Issaries | 2 riding zebras (non-combat) | **exists** |
| Vishi Dunn | Waha | Cousin Monkey + High Llama | **exists** |
| Vostor | Seven Mothers | Small Fire Elemental (summoned) | **MISSING** |
| Sorala | Lhankor Mhy | None (has Find Magic matrix) | **exists** |
| Nathem | Odayla | Rurik (shadowcat) | **exists** |
| Aranda | Babeester Gor | 2 riding horses (non-combat) | **exists** |
| Dazarim | Yelmalio | Sevara (sable antelope) | **exists** |
| Ionara | Maran Gor | Teza (riding horse) | **exists** |

## Decision: Companion Types

Not all "companions" are structured the same way:

### Type A: Animal Mounts/Pets (structured companion block)
Full stat blocks with hit locations, attacks, characteristics, HP tracking:
- **Vasana**: Molon the bison (war-trained, STR 36, CON 17, SIZ 34)
- **Ionara**: Teza the riding horse (STR 30, CON 17, SIZ 30)
- **Nathem**: Rurik the shadowcat (STR 36, CON 17, SIZ 34)
- **Dazarim**: Sevara the sable antelope (STR 26, CON 12, SIZ 27)
- **Vishi**: Cousin Monkey (STR 17, CON 11, SIZ 10) + High Llama (STR 36, CON 15, SIZ 42)

### Type B: Summoned Elementals (notes only, not structured companion)
These are summoned via Rune magic and don't persist as permanent companions:
- **Yanioth**: Earth Elemental (small/medium/large, costs 1/2/3 Rune Points)
- **Vostor**: Small Fire Elemental (costs 1 devotional point)

### Type C: Non-combat mounts (minimal notes)
- **Harmast**: 2 riding zebras (Move 12, not trained for combat)
- **Aranda**: 2 riding horses (non-combat, standard horse stats)

**Decision**: Type A gets full `companions[]` array. Types B and C get `notes` field entries only — elementals are magic effects (not persistent creatures), and non-combat mounts don't need HP tracking.

## Decision: Seven Mothers Cult

Vostor's cult "Seven Mothers" is not in CULTS_DATA. Options:
- (a) Add Seven Mothers to CULTS_DATA from upstream PDF (`references/cults-upstream/Lunar/`)
- (b) Set `cult: "Seven Mothers"` and skip miracle validation for this pre-gen

**Decision**: (b) — Pre-gens with `charMethod: "pregen"` bypass cult validation. Vostor's rune magic spells (Madness, Mindblast, Summon Fire Elemental) are recorded in the fixture but not validated against CULTS_DATA. Adding the full Lunar pantheon to CULTS_DATA is out of scope for this pipeline.

## Decision: Characteristic Handling

The deprecated pipeline scaled characteristics to a 75-point Mythras build. However, the current Vasana/Ionara fixtures use the **raw RQG characteristic values** directly. This is correct for pre-gens because:
- Pre-gens bypass the generator's characteristic allocation
- The folio values ARE the character — scaling them changes who the character is
- Derived attributes (action points, damage modifier, etc.) are calculated from whatever values are stored

**Decision**: Use raw RQG characteristics from the PDF. Do NOT scale to 75 points.

## Decision: Skill Mapping (RQG → Mythras)

The fixture format uses three skill allocation maps (`culturalSkills`, `careerSkills`, `bonusSkills`) that each sum to 100 points. These represent BONUS points above base, not total skill values.

For pre-gens, we CANNOT reverse-engineer individual category allocations from the PDF's total skill values (which include base + all bonuses). Instead:

**Decision**: For pre-gens, we store skill allocations as a reasonable distribution that sums to 100 per category, reflecting the character's focus areas. The actual played skill values come from the `weapons[].skill` and combat style `value` fields for combat, and are hand-assigned for non-combat skills based on the PDF totals.

The skill mapping from RQG names to Mythras names:
- Battle → Lore (Strategy and Tactics)
- Cult Lore (X) → Lore (X)
- Farm → Craft (Farming)
- Herd → Craft (Animal Husbandry)
- Homeland Lore (X) → Lore (X)
- Read/Write (X) → Literacy (X)
- Orate → Oratory
- Bargain / Evaluate → Commerce
- Manage Household → Bureaucracy
- Play Instrument → Musicianship
- Intrigue → Deceit
- Intimidate → Influence

## Decision: Combat Styles

Each character gets a custom combat style name reflecting their actual background (not AiG generic names):

| Character | Combat Style Name | Weapons |
|-----------|------------------|---------|
| Vasana | Colymar Bison Cavalry | Broadsword, Lance, Medium Shield, Composite Bow |
| Yanioth | Ernaldori Guardian | Dagger, Battle Axe, Medium Shield, Composite Bow |
| Harmast | Issaries Duelist | Broadsword, Dagger, Battle Axe, Medium Shield, Javelin |
| Vishi | Blue Llama Nomad | Lance, Dagger-axe, Dagger, Pole Lasso |
| Vostor | Dunstop Infantry | Kopis, Dagger, Large Shield, Medium Shield, Javelin, Composite Bow |
| Sorala | Nochet Scholar-Blade | Broadsword, Battle Axe, Medium Shield, Sling, Thrown Axe |
| Nathem | Tarshite Bowman | Composite Bow, Battle Axe, Dagger, Broadsword, Medium Shield, Javelin |
| Aranda | Hulta Axe Maiden | Battle Axe (1H), Battle Axe (2H), Medium Shield, Self Bow, Throwing Axe, Short Spear |
| Dazarim | Sable Rider Nomad | Kopis, Dagger, Javelin, Medium Shield |
| Ionara | Grazelander Noble | Mace, Small Shield, Lance, Dagger |

## Decision: Miracle Validation

For each character's `miracles[]` array, we must verify the spells exist in CULTS_DATA for their cult. Exceptions:
- Vostor (Seven Mothers not in CULTS_DATA) — record miracles without validation
- Subcult miracles use the format "Subcult: Miracle Name" in CULTS_DATA

## Pipeline Architecture

```
scripts/convert-pregens.mjs
├── reads: fixtures/intermediate/*.json  (hand-transcribed from PDF)
├── applies: conversion rules (skill mapping, attribute calculation, companion structuring)
├── validates: skill totals = 100, miracles exist in CULTS_DATA, weapons have stats
└── outputs: fixtures/*.json (final fixture files)
```

### Intermediate JSON Format (hand-transcribed input)

```json
{
  "name": "Character Name",
  "concept": "One-line concept",
  "gender": "Female",
  "age": 21,
  "cult": "Cult Name",
  "characteristics": { "STR": 16, "CON": 12, ... },
  "rqgSkills": { "Broadsword": 90, "Ride (Bison)": 70, ... },
  "rqgPassions": [ { "name": "Devotion (Orlanth)", "value": 80 }, ... ],
  "rqgWeapons": [ { "name": "Broadsword", "skill": 90, "damage": "1D8+1+1D4", "sr": 5, "pts": 12 }, ... ],
  "rqgHitLocations": { "Right Leg": { "d20": "01-04", "ap": 6, "hp": 4 }, ... },
  "rqgAttributes": { "hitPoints": 12, "move": 8, "strikeRank": "5 (DEX 3, SIZ 2)", ... },
  "rqgMagic": { "runeSpells": ["Shield", "Lightning", "Fearless"], "spiritSpells": ["Demoralize", "Heal 2", "Mobility"], ... },
  "runeAffinities": { "Air": 90, "Earth": 20, "Fire": 0, ... },
  "companion": { ... raw companion data from PDF ... },
  "equipment": { "armor": "...", "treasures": "...", "magicItems": "..." },
  "background": "..."
}
```

## Disambiguation Strategy

Pre-gens with `charMethod: "pregen"` bypass the generator's skill disambiguation. All skill names in fixtures must be fully resolved (no `(any)` placeholders). The conversion script validates this.

## Export/Save Fidelity Strategy

All fixture fields must persist identically through:
- JSON save/load (`toJSON()`/`fromJSON()` at index.html:13542/13590)
- PDF export (index.html:17687 renders companions)
- Play Mode display (index.html:17278 renders companions)

The conversion script outputs the exact JSON that the app expects. No runtime transformation is needed.

## E2E Test Strategy

New test file: `test-fixtures.mjs` using Playwright (same pattern as test-100-chars.mjs)

Tests:
1. **Load each fixture** — navigate app, inject fixture JSON via page.evaluate, verify no errors
2. **Validate structure** — check all required fields present, skill totals = 100
3. **Companion rendering** — for Type A companions, verify companion section renders with correct name/species/stats
4. **HP tracking** — modify a companion hit location HP, verify it persists
5. **JSON round-trip** — save to JSON via toJSON(), reload via fromJSON(), verify deep equality
6. **PDF export** — trigger PDF export, verify no crash (content verification is manual)
7. **No placeholder leaks** — scan all skill names for unresolved patterns

## ADRs Needed

1. **ADR: Source Precedence for Pre-gen Fixtures** — documents the hierarchy above
2. **ADR: RQG Characteristics Used Directly** — documents why we don't scale to 75 points
3. **ADR: Custom Combat Styles** — documents why pre-gens use non-AiG style names
4. **ADR: Seven Mothers Cult Not in CULTS_DATA** — documents scope exclusion
5. **ADR: Companion Type Classification** — documents A/B/C distinction

## Risks

1. **PDF transcription errors** — Manual transcription from graphical PDF is error-prone. Mitigation: cross-reference with deprecated fixtures where values overlap.
2. **Miracle validation gaps** — Some rune magic spells from the PDF may not exist in CULTS_DATA (OCR issues in cult data). Mitigation: clean CULTS_DATA OCR issues first (partially done).
3. **Skill total arbitrariness** — The 100-point allocation per category is somewhat arbitrary for pre-gens since we can't reverse-engineer the original breakdown. Mitigation: allocations should reflect character concept priorities.
4. **Seven Mothers blocker** — Vostor cannot have his miracles validated. Mitigation: skip validation for this character, document in ADR.

## Implementation Phases

### Phase 1: Intermediate JSON transcription
- Transcribe all 10 characters from PDF into `fixtures/intermediate/*.json`
- Cross-reference companion data with deprecated COMPANION_BLOCKS

### Phase 2: Conversion script
- `scripts/convert-pregens.mjs` — Node.js, no external deps
- Reads intermediate JSON, applies conversion rules, outputs fixture JSON
- Validates: skill totals, miracle existence, weapon stats, no placeholders

### Phase 3: Fixture generation
- Run script, produce 10 fixture files
- Replace deprecated fixtures with new ones
- Delete deprecated fixture files and old pipeline script

### Phase 4: E2E tests
- `test-fixtures.mjs` — loads each fixture, validates rendering, companion HP tracking, JSON round-trip

### Phase 5: Cleanup
- Remove deprecated files (old format fixtures, generate_starter_set_pregens.py)
- Update _conversion-summary.json
