# Design: Pre-gen Combat Style & Skill Budget Decisions

**Status:** accepted
**Date:** 2026-05-04
**Upstream:** RQG Starter Set pre-gen folios, AiG combat style definitions

## Problem

The Vasana and Ionara pre-gen fixtures carry weapons that don't match the AiG "Sartarite Noble" combat style definition (Broadsword, 1H Spear, Orlanthi Scutum, Javelin). These are RQG conversions with different weapon loadouts reflecting their specific backgrounds.

## Decision: Custom Combat Styles

### Vasana → "Colymar Bison Cavalry"
- **Weapons:** Broadsword, Lance, Medium Shield, Composite Bow
- **Traits:** Intimidating Scream, Mounted Combat, Shield Wall
- **Rationale:** Vasana is a bison-riding Colymar warrior. Lance and Composite Bow are core mounted weapons. Medium Shield replaces Orlanthi Scutum (functionally equivalent, different naming in RQG source).

### Ionara → "Grazelander Noble"
- **Weapons:** Mace, Small Shield, Lance, Dagger
- **Traits:** Intimidating Scream, Mounted Combat, Shield Wall
- **Rationale:** Ionara is Pure Horse People, not Sartarite. Mace is Maran Gor's sacred weapon (Earth rune association). Small Shield + Lance + Dagger reflects mounted priestess archetype.

### Why not use AiG "Sartarite Noble" as-is?
- Vasana's bison cavalry weapons (Lance, Composite Bow) differ from the Sartarite spear-and-javelin infantry noble
- Ionara is not Sartarite — she is Grazelander Pure Horse People
- Pre-gens (`charMethod: "pregen"`) bypass the generator anyway; custom style names avoid false validation failures

## Decision: Skill Point Budgets (100 per category)

All three skill categories (culturalSkills, careerSkills, bonusSkills) must sum to exactly 100 points per the Mythras/AiG character creation rules.

### Vasana bonusSkills fix (was 45, now 100)
Added: Willpower +15, Endurance +10, Athletics +10, Brawn +10, First Aid +10
- Rationale: Warrior-leader benefits from combat-adjacent physical and mental resilience skills

### Ionara careerSkills fix (was 125, now 100)
Reduced: Dance 20→10, Sing 20→10, Musicianship 15→10
- Rationale: Priest career gives broad skill access; reduced performance skills to standard allocation level

### Ionara bonusSkills fix (was 55, now 100)
Added: Endurance +10, Willpower +10, Athletics +10, First Aid +10, Locale +5
- Rationale: Wandering proselytiser needs travel/survival-adjacent skills

## Source Attestation

| Field | Source | Confidence |
|-------|--------|------------|
| Vasana's weapons | RQG Starter Set Vasana folio | High (direct transcription) |
| Ionara's weapons | RQG Starter Set Ionara folio | High (direct transcription) |
| Trait list | AiG Sartarite Noble traits (shared) | Medium (traits borrowed, weapons diverge) |
| Skill allocations | House rules (balanced to 100) | Author discretion |
| Combat style names | Custom (not in AiG CULTURES_DATA) | Author discretion |
