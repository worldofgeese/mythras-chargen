---
status: accepted
date: 2026-05-04
decision-makers: [worldofgeese]
---

# ADR-0003: Custom Combat Styles for Pre-gen Characters

## Context and Problem Statement

AiG defines specific combat styles per culture (e.g., "Sartarite Noble" with Broadsword, 1H Spear, Orlanthi Scutum, Javelin). However, the RQG pre-gens carry different weapon loadouts that don't match these definitions. Forcing AiG styles would mean either:
- Changing the character's weapons (losing fidelity to the source)
- Having a named style whose weapon list doesn't match the AiG definition (confusing)

## Decision

Each pre-gen gets a custom combat style name that reflects their specific background. These names do NOT exist in AiG's CULTURES_DATA and are exclusive to pre-gen fixtures.

| Character | Style Name | Reason |
|-----------|-----------|--------|
| Vasana | Colymar Bison Cavalry | Bison-mounted Colymar warrior |
| Ionara | Grazelander Noble | Pure Horse People, not Sartarite |
| Yanioth | Ernaldori Guardian | Earth priestess defender |
| Harmast | Issaries Duelist | Merchant-diplomat who fights with finesse |
| Vishi | Blue Llama Nomad | High Llama clan spirit-warrior |
| Vostor | Dunstop Infantry | Lunar heavy infantry from Tarsh |
| Sorala | Nochet Scholar-Blade | Esrolian Lhankor Mhy initiate |
| Nathem | Tarshite Bowman | Hunter from Old Tarsh |
| Aranda | Hulta Axe Maiden | Babeester Gor devotee |
| Dazarim | Sable Rider Nomad | Praxian Sable tribe |

## Consequences

- Custom styles bypass any combat-style-to-culture validation
- `charMethod: "pregen"` ensures no style validation occurs during load
- Combat style traits are borrowed from the closest AiG style or assigned based on character concept

## Implementation Plan

- **Affected paths**: `fixtures/*.json` (combatStyles field)
- **Pattern**: `combatStyles[].name` uses custom name, `combatStyles[].weapons` matches actual PDF weapon list
- **Tests**: Verify each fixture has at least one combat style with non-empty weapons array

## Verification

- [ ] No fixture uses an AiG combat style name
- [ ] Each fixture's combat style weapons match the character's actual weapon inventory
