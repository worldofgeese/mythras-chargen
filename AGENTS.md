# AGENTS.md — Adventures in Glorantha Character Sheet

## What This Is
A single-file HTML character generator for Adventures in Glorantha (Mythras engine). Creates Gloranthan characters through a 12-step wizard and provides a Play Mode for at-the-table use.

## Source Hierarchy
1. **Mythras Core Rulebook** (TDM, 3rd Printing 2018) — engine of truth
2. **Adventures in Glorantha** (TDM, GenCon 2015 Preview) — Gloranthan overlay
3. **Cult One-Pagers** (CultOnePagers2019) — cult-facing authority

## Attestable Provenance Chains
Every data field traces back to a source PDF through a reference JSON:

### Mythras Core (references/mythras-raw/)
| File | Source Pages | Contents |
|------|-------------|----------|
| characteristics.json | p.9-12 | 7 characteristics, formulas |
| standard-skills.json | p.12, p.54 | 22 standard skills |
| professional-skills.json | p.45-54 | 36 professional skills |
| attributes.json | p.9-12 | Derived attributes |
| age-bonus-points.json | p.32-33 | Age categories, bonus points |
| folk-magic-spells.json | p.122-130 | 70 folk magic spells |
| creation-summary.json | p.7-34 | Character creation steps |
| melee-weapons.json | p.74-106 | Melee weapon stats |
| ranged-weapons.json | p.74-106 | Ranged weapon stats |
| armour.json | p.57-58 | Armour stats |
| encumbrance.json | p.69-71 | Encumbrance rules |
| careers-by-culture.json | p.28 | Careers per culture type |

### AiG (references/aig-raw/)
| File | Source Pages | Contents |
|------|-------------|----------|
| cultures-mistral.json | p.26-41 | 8 cultures (Mistral OCR) |
| creation-summary-aig.json | p.23-25 | 12-step process |
| rune-affinities.json | p.24 | Rune affinity system |
| careers.json | p.24 | Career types by culture |

### Extraction Methods
- **pdftotext**: Mythras Core (text-layer pages)
- **Mistral OCR API**: AiG p.29-41 (image-embedded pages)
- **Image + vision model**: AiG p.31 (God Forgot stats)
- **web_search**: Trademark statements

## Active Rules
- 75-point characteristic build (Mythras Core p.9-10)
- INT/SIZ minimum 8 for point-buy
- Cultural/career skills: max 15 per skill, 100 total budget
- 1 hobby professional skill in bonus points
- Initiative Bonus: Math.floor((DEX+INT)/2) — rounds down
- Folk magic list curated for Glorantha (62 spells)
- Rune affinities: 3 elemental runes at POW×2 + 30/20/10%

## Trademark Compliance
Both statements are in the HTML footer:
- Design Mechanism: "Mythras" is a Registered Trademark of The Design Mechanism Inc
- Chaosium Fan Policy: Full statement with www.chaosium.com link

## Key File
- `aig-character-sheet.html` — single self-contained file (HTML + CSS + JS)

## Data Constants
| Constant | Entries | Source |
|----------|---------|--------|
| SKILLS_DATA | 75 | Mythras Core p.12, p.45-54 |
| CULTURES_DATA | 8 cultures, 44 combat styles | AiG p.26-41 |
| WEAPONS_DATA | 284 weapons | Mythras Core p.74-106 |
| AGE_TABLE | 5 rows | Mythras Core p.32-33 |
| FOLK_MAGIC_SPELLS | 62 spells | Mythras Core p.122-130 + AiG |
| CAREERS_DATA | 24 careers | Mythras Core p.28-34 |
| COMBAT_TRAITS_DATA | 114 traits | Mythras Core + AiG |
| DAMAGE_MOD_TABLE | 20 entries | Mythras Core p.10 |

## Validation History
- validation-report.md — field-by-field attestable chain validation
- 6 cook runs with review gates, all passed
- 15 original request bullets validated and remediated

## What NOT to use
- RuneQuest Weapons & Equipment (Chaosium, RQ7) — different engine, incompatible stats
- Any RQ7/Chaosium-era stat blocks — this is Mythras (TDM), not RuneQuest (Chaosium)
