# Data Flow

## Character Creation Pipeline

```
User Input (Wizard Steps 1-12)
  → CharacterData (mutable global state)
    → App.saveToLocalStorage() (persistence)
    → App.compileAllSkills() (derived state)
      → Play Mode / PDF Export / JSON Export
```

## Data Constants → UI

```
CULTURES_DATA (array of culture objects)
  → Step 4: Culture selection dropdown
  → Step 5: Cultural skill allocation (standardSkills, professionalSkills)
  → CULTURE_CULT_MAP: filters available cults per culture

CAREERS_DATA (array of career objects)
  → Step 8: Career selection (filtered by culture type)
  → Step 10: Career skill allocation

CULTS_DATA (94 cult objects with cultSkills[], miracles[], folkMagic[])
  → detectCultType(cult) → {primary, types[], isHybrid}
    → selectCult() branches:
      → 'theist': renders miracle picker from cult.miracles[]
      → 'animist': renders spirit picker from spirits-raw data
      → 'sorcery': renders spell picker from SORCERY_SPELLS
      → 'mysticism': renders mysticism ability picker

MIRACLES_DATA (per-cult miracle lists with rune tags)
  → Miracle picker UI (checkbox list, limit = POW/2)

SORCERY_SPELLS (34 spells from Mythras Core)
  → Sorcery spell picker UI (checkbox list, limit = INT/4)

FOLK_MAGIC_DESCRIPTIONS (45 AiG spells with descriptions)
  → Tooltip rendering on folk magic checkboxes

CULTURE_CULT_MAP (culture → {primary[], secondary[]} cult names)
  → Step 9: Filters which cults appear for the selected culture
```

## Skill Compilation

Skills accumulate points across multiple steps:

```
Base value (characteristic formula, e.g., STR+DEX for Athletics)
  + Cultural allocation (Step 5, 100 points)
    + Career allocation (Step 10, 100 points)
      + Bonus allocation (Step 11, 150 or 200 points)
        = Final skill value
```

`App.compileAllSkills()` merges all layers into a flat array of `{name, base, cultural, career, bonus, total}`.

## Validation Checkpoints

| Step | Constraint | Error if violated |
|------|-----------|-------------------|
| 2 | Characteristics sum = 75 | "Characteristics must sum to 75" |
| 5 | Cultural skills = 100 points | "Must allocate exactly 100 cultural skill points" |
| 10 | Career skills = 100 points | "Must allocate exactly 100 career skill points" |
| 11 | Bonus skills = 150 or 200 | "Must allocate exactly N bonus skill points" |

## Age System

Age (Step 7) affects:
- Bonus point total (younger = 150, older = 200)
- Maximum points per skill
- Derived from `AGE_TABLE` constant

## Social Class (Step 12)

Determined by culture type + d100 roll (or manual selection):
- Affects starting money
- Affects equipment quality
- Data from `SOCIAL_CLASS_TABLES[cultureType]`

## Export Paths

```
CharacterData
  → App.agent.getState()    → JSON export / Agent API consumers
  → PDF template rendering  → Fillable PDF character sheet
  → Play Mode UI            → Interactive character display
```
