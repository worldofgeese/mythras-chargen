# Phase 2: Theism Miracles UI — Task Brief

## Goal

Wire `MIRACLES_DATA` (already inlined at line 966) into the cult selection step so players can see and select miracles for their character.

## What Exists

- `MIRACLES_DATA` — 1,323 miracles across 78 cults, fully tagged with runes, rank, source
- Rune Affinity selection UI — Step 5, 3 elemental runes at POW×2+30/20/10%
- Cult Selection — Step 9, shows cult cards with pantheon/personality/folk magic
- `CharacterData.runeAffinities` — `{primary, secondary, tertiary}` with short_name values
- `CharacterData.cult` — selected cult name
- `CULTS_DATA` — full cult array with `.miracles[]` per cult (from MIRACLES_DATA merge)

## What's Missing (implement these)

### 1. Expand Cult Card with Miracle Preview

In `App.renderCultCard()` (line ~15046), add a miracles section below folk magic:
- Show available miracles for the cult (from `MIRACLES_DATA[cultName].miracles`)
- Display rune requirement tags next to each miracle name
- Highlight miracles whose rune matches the character's selected rune affinities (green/bold)
- Dim/grey miracles whose rune doesn't match any affinity (still selectable, just harder to cast)

### 2. Miracle Selection UI

After cult is selected (`App.selectCult()`), show a miracle picker:
- **Initiates:** Pick up to 2 miracles from cult's Initiate list
- **Devotees (Runelord):** Pick up to 5 from combined Initiate + Runelord lists
- Default to Initiate rank (add rank selector if time permits)
- Each miracle shows: name, rune requirement, brief effect if available
- Selected miracles stored in `CharacterData.miracles = [{name, rune, rank}]`

### 3. Devotional Pool

Add `CharacterData.devotionalPool` = Math.floor(POW / 2) for Initiates.
Display in attributes section alongside Magic Points.

### 4. Play Mode Rendering

In Play Mode, add a "Theist Miracles" section:
- List selected miracles with casting percentage (= matching Rune Affinity value)
- Show Devotional Pool as spendable resource
- Visual distinction from Folk Magic section

### 5. PDF Export

Add miracles to PDF export (simple path — text block listing miracles + casting %).

## Architecture Constraints

- Single-file: everything inline in index.html
- No external dependencies
- `MIRACLES_DATA` is already inlined — just wire it into the cult step logic
- Match existing code style (vanilla JS, template literals, inline styles)
- Preserve all existing functionality (folk magic, passions, combat styles, etc.)

## Key Data Shape

```js
// MIRACLES_DATA structure (already in file):
MIRACLES_DATA = {
  "cult_count": 78,
  "cults": {
    "Orlanth Adventurous": {
      "miracles": [
        {"name": "Shield", "runes": ["Air"], "rank": "initiate", "source": "cult_one_pager"},
        {"name": "Thunderbolt", "runes": ["Air", "Fire"], "rank": "runelord", "source": "cult_one_pager"}
      ]
    }
  }
}

// CharacterData additions:
CharacterData.miracles = []        // [{name: string, rune: string, rank: string}]
CharacterData.devotionalPool = 0   // Math.floor(POW / 2)
CharacterData.cultRank = 'initiate' // or 'runelord'
```

## Testing

- Generate 3 characters with different cults, verify miracles appear and are selectable
- Verify rune highlighting matches selected affinities
- Verify Play Mode shows miracles with correct casting %
- Verify PDF includes miracle list

## Branch

Work on `feat/theism-phase2-miracles-ui` (current branch, already has MIRACLES_DATA inlined).
