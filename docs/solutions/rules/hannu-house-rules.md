---
title: Hannu's House Rules (AiG Adaptations)
category: rules
module: magic-system
problem_type: house_rule_mapping
tags:
  - hannu
  - house-rules
  - rune-affinity
  - magic
---

# Hannu's House Rules (AiG Adaptations)

## Problem

The campaign uses Adventures in Glorantha adaptations of Mythras Core rules. Several standard skills are replaced by Rune Affinity skills, which changes how magic skill values are calculated and displayed.

## Rules

| Standard Mythras Skill | Replaced By |
|---|---|
| Binding | Spirit Rune Affinity |
| Invocation | Spell's Rune Affinity |
| Shaping | Law Rune affinity |

## Impact on Implementation

- Skill lookups must map these replacements when calculating magic skill values.
- Character sheets should display the Rune Affinity name, not the standard skill name.
- Cult skill lists in the data may still reference the original names — the mapping happens at render/calculation time.

## Key Insight

House rules are best handled as a mapping layer between raw data and display/calculation, not by modifying the source data. This keeps the data portable and the rules reversible.

## When to Apply

- Rendering magic skills on the character sheet.
- Calculating spell casting chances.
- Adding support for toggling between standard and house rules.
