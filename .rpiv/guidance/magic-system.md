# Magic System Architecture

## Cult Type Detection (`detectCultType()`, index.html ~line 830)

Auto-classifies 94 cults into magic system types by inspecting their `cultSkills[]` array with regex pattern matching.

### Detection Signals

| Regex Pattern | Magic Type | Example Skills |
|---------------|-----------|----------------|
| `/^Devotion/i` | theist | Devotion (Orlanth), Devotion (Ernalda) |
| `/^Trance/i` or `/^Binding/i` | animist | Trance, Binding |
| `/^Invocation/i` or `/^Shaping/i` | sorcery | Invocation, Shaping |
| `/^Mysticism/i` or `/^Meditation/i` | mysticism | Mysticism, Meditation |

### Return Value

```js
{
  primary: 'theist',      // First detected type (drives UI branching)
  types: ['theist'],      // All detected types
  isHybrid: false         // true when types.length > 1
}
```

### Fallback Behavior

If no recognized magic skills are found in `cultSkills[]`, the function defaults to `theist` — this is the most common cult type in Glorantha and a safe assumption for cults whose data may be incomplete.

### Hybrid Cults

Some cults (e.g., Jakaleel with both Devotion and Trance) return `isHybrid: true`. The UI branches to show multiple magic pickers when this occurs.

## Data Flow

```
CULTS_DATA (94 cults, each with cultSkills[])
  → detectCultType(cult)
    → {primary, types[], isHybrid}
      → selectCult() branches on primary type
        → theist: miracle picker (MIRACLES_DATA)
        → animist: spirit picker (spirits-raw/)
        → sorcery: sorcery spell picker (SORCERY_SPELLS)
        → mysticism: mysticism abilities
```

## Picker Pattern (Miracle/Sorcery/Spirit Selection)

All magic pickers share the same structural pattern:

1. **Checkbox list** — rendered from data constant
2. **Limit enforcement** — checked in toggle function before adding
3. **State storage** — pushed to array on `CharacterData`
4. **Re-render** — `App.renderCurrentStep()` called after toggle

### Limits by Magic Type

| Type | Limit Formula | State Field |
|------|--------------|-------------|
| Theist (miracles) | POW / 2 (rounded up) | `CharacterData.miracles[]` |
| Sorcery (spells) | INT / 4 (rounded up) | `CharacterData.sorcerySpells[]` |
| Animist (spirits) | min(3, CHA / 2) | `CharacterData.boundSpirits[]` |
| Folk Magic | 3 (cultural step) | `CharacterData.folkMagicSpells[]` |
| Career Folk Magic | 2 (career step) | `CharacterData.careerFolkMagic[]` |

### Toggle Functions

```
App.toggleFolkMagicSpell(spell, checked, maxCount)  — folk magic (cultural)
App.toggleSorcerySpell(spellName)                   — sorcery spells
App.toggleBoundSpirit(spiritName)                   — animist spirits
App.toggleCareerFolkMagicSpell(spell, checked)      — folk magic (career)
```

Each function:
1. Checks if adding would exceed limit → shows toast error if so
2. Adds/removes from the relevant `CharacterData` array
3. Calls `App.saveToLocalStorage()`
4. Optionally calls `App.renderCurrentStep()` for UI refresh

## Data Sources

| Data Constant | Source | Content |
|---------------|--------|---------|
| `MIRACLES_DATA` | `references/theism-miracles.json` | Per-cult miracle lists with rune tags |
| `SORCERY_SPELLS` | `references/mythras-raw/sorcery.json` | 34 spells from Mythras Core |
| `FOLK_MAGIC_DESCRIPTIONS` | `references/aig-raw/folk-magic-aig.json` | 45 AiG folk magic spells |
| Spirit data | `references/spirits-raw/` | Spirit types from Monster Island, Bird in Hand |

## House Rules (ADR-002)

The rune affinity casting model is a house rule from Hannu (GM). Key points:
- Devotional pool size = POW/2
- Rune affinities (primary/secondary/tertiary) affect casting difficulty
- Documented in `docs/adr/002-rune-affinity-casting-model.md`
- Source artifact: Discord conversation screenshots in `docs/adr/artifacts/`
