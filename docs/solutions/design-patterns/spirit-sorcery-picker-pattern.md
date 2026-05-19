# Spirit/Sorcery Picker Design

## Problem

Characters joining animist or sorcery cults need to pick starting spirits or spells, with limits based on characteristics (INT for sorcery, CHA for spirits).

## Solution

Reused the existing miracle picker pattern (from theist cults):

1. Render a checkbox list of available spirits/spells from the cult data.
2. Enforce a selection limit:
   - **Sorcery**: `Math.floor(INT / 4)` spells.
   - **Spirits**: `Math.min(3, Math.floor(CHA / 2))` spirits.
3. Disable unchecked items once the limit is reached.
4. Store selections in the same `character.magic` structure used by miracles.

## Key Insight

The miracle picker's checkbox-with-limit pattern generalizes cleanly to all magic types. The only variation is the limit formula and the source list. Keep the UI component generic and parameterize the limit calculation.

## When to Apply

- Adding new magic types (e.g., mysticism paths).
- Changing limit formulas per house rules.
- Debugging "can't select more" issues — check the limit formula first.
