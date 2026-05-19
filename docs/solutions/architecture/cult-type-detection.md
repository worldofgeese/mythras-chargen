# Cult Type Detection from Skill Patterns

## Problem

94 AiG cults need to be classified by magic type (theist, animist, sorcery, mysticism) but the source data does not include an explicit type field. Classification must be inferred from the cult's skill list.

## Solution

`detectCultType()` applies regex patterns against the `cultSkills` array entries:

| Signal Pattern | Detected Type |
|---|---|
| `Devotion` | theist |
| `Trance` or `Binding` | animist |
| `Invocation` or `Shaping` | sorcery |
| `Mysticism` or `Meditation` | mysticism |

The function checks in priority order and returns the first match. Cults with none of these signals default to theist (the most common type in Glorantha).

## Key Insight

Magic-type classification is reliably encoded in the skill names themselves. Devotion is unique to theism, Trance/Binding to animism, etc. This avoids needing a manual lookup table for 94 cults.

## When to Apply

- Adding new cults from other Mythras supplements.
- Debugging why a cult's magic picker shows the wrong spell list.
- Extending to handle hybrid cults (multiple magic types).
